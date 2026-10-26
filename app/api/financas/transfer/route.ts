import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type TransferBody = {
  sourceAccountId?: string;
  destinationAccountId?: string;
  amount?: number | string;
  description?: string | null;
  date?: string;
};

function generateTransferReference() {
  return `TRF-${Date.now()}-${Math.floor(
    Math.random() * 9999
  )
    .toString()
    .padStart(4, "0")}`;
}

export async function POST(
  request: Request
) {
  try {
    const session =
      await requireAdmin();

    const body =
      (await request.json()) as TransferBody;

    const {
      sourceAccountId,
      destinationAccountId,
      amount,
      description,
      date,
    } = body;

    /*
     * ========================================================
     * VALIDAÇÕES
     * ========================================================
     */

    if (
      !sourceAccountId ||
      !destinationAccountId
    ) {
      return NextResponse.json(
        {
          message:
            "Escolha a conta de origem e a conta de destino.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      sourceAccountId ===
      destinationAccountId
    ) {
      return NextResponse.json(
        {
          message:
            "A conta de origem e a conta de destino devem ser diferentes.",
        },
        {
          status: 400,
        }
      );
    }

    const amountValue =
      Number(amount);

    if (
      !Number.isFinite(
        amountValue
      ) ||
      amountValue <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "O valor da transferência deve ser superior a zero.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * VALIDAR AS DUAS CONTAS
     *
     * Ambas têm obrigatoriamente de pertencer à empresa.
     * ========================================================
     */

    const [
      sourceAccount,
      destinationAccount,
    ] = await Promise.all([
      prisma.financialAccount.findFirst({
        where: {
          id:
            sourceAccountId,

          companyId:
            session.companyId,

          status:
            "ACTIVE",
        },
      }),

      prisma.financialAccount.findFirst({
        where: {
          id:
            destinationAccountId,

          companyId:
            session.companyId,

          status:
            "ACTIVE",
        },
      }),
    ]);

    if (!sourceAccount) {
      return NextResponse.json(
        {
          message:
            "Conta de origem inválida.",
        },
        {
          status: 400,
        }
      );
    }

    if (!destinationAccount) {
      return NextResponse.json(
        {
          message:
            "Conta de destino inválida.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * SALDO DISPONÍVEL
     * ========================================================
     */

    if (
      Number(
        sourceAccount.balance
      ) < amountValue
    ) {
      return NextResponse.json(
        {
          message:
            "Saldo insuficiente na conta de origem.",
        },
        {
          status: 400,
        }
      );
    }

    const transferReference =
      generateTransferReference();

    const transferDate =
      date
        ? new Date(date)
        : new Date();

    const transferDescription =
      description?.trim() ||
      `Transferência interna: ${sourceAccount.name} → ${destinationAccount.name}`;

    /*
     * ========================================================
     * TRANSFERÊNCIA ATÓMICA
     *
     * Se qualquer operação falhar:
     * tudo faz rollback.
     * ========================================================
     */

    const result =
      await prisma.$transaction(
        async (
          tx: TransactionClient
        ) => {
          /*
           * DEBITAR ORIGEM
           */
          await tx.financialAccount.update({
            where: {
              id:
                sourceAccount.id,
            },

            data: {
              balance: {
                decrement:
                  amountValue,
              },
            },
          });

          /*
           * CREDITAR DESTINO
           */
          await tx.financialAccount.update({
            where: {
              id:
                destinationAccount.id,
            },

            data: {
              balance: {
                increment:
                  amountValue,
              },
            },
          });

          /*
           * MOVIMENTO DE SAÍDA DA ORIGEM
           *
           * É EXPENSE apenas para representar
           * o sentido do movimento.
           *
           * referenceType = TRANSFER permite
           * excluí-lo das Saídas reais da empresa.
           */
          const outgoing =
            await tx.financeTransaction.create({
              data: {
                companyId:
                  session.companyId,

                userId:
                  session.userId,

                financialAccountId:
                  sourceAccount.id,

                type:
                  "EXPENSE",

                amount:
                  amountValue,

                description:
                  transferDescription,

                date:
                  transferDate,

                referenceType:
                  "TRANSFER",

                referenceId:
                  transferReference,
              },
            });

          /*
           * MOVIMENTO DE ENTRADA NO DESTINO
           */
          const incoming =
            await tx.financeTransaction.create({
              data: {
                companyId:
                  session.companyId,

                userId:
                  session.userId,

                financialAccountId:
                  destinationAccount.id,

                type:
                  "INCOME",

                amount:
                  amountValue,

                description:
                  transferDescription,

                date:
                  transferDate,

                referenceType:
                  "TRANSFER",

                referenceId:
                  transferReference,
              },
            });

          return {
            outgoing,
            incoming,
          };
        }
      );

    return NextResponse.json({
      message:
        "Transferência realizada com sucesso.",

      transfer: {
        reference:
          transferReference,

        amount:
          amountValue,

        sourceAccount: {
          id:
            sourceAccount.id,

          name:
            sourceAccount.name,
        },

        destinationAccount: {
          id:
            destinationAccount.id,

          name:
            destinationAccount.name,
        },

        transactions:
          result,
      },
    });
  } catch (error) {
    console.error(
      "ERRO TRANSFERÊNCIA FINANCEIRA:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao realizar transferência.",
      },
      {
        status: 500,
      }
    );
  }
}