import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function toNumber(value: unknown) {
  return Number(value || 0);
}

function generateInvoiceNumber() {
  const date = new Date();

  const stamp = date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");

  return `FT-${stamp}-${random}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const session = await requireAuth();
    const { saleId } = await params;

    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        companyId: session.companyId,
      },
      include: {
        cantina: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { message: "Venda não encontrada." },
        { status: 404 }
      );
    }

    const company = await prisma.company.findUnique({
      where: {
        id: session.companyId,
      },
    });

    let invoice = await prisma.invoice.findUnique({
      where: {
        saleId: sale.id,
      },
    });

    if (!invoice) {
      try {
        const subtotal = toNumber(sale.totalAmount);
        const totalAmount = toNumber(sale.totalAmount);

        invoice = await prisma.invoice.create({
          data: {
            companyId: session.companyId,
            saleId: sale.id,
            invoiceNumber: generateInvoiceNumber(),
            customerName: sale.customerName || null,
            customerTaxId: sale.customerTaxId || null,
            subtotal,
            discountAmount: 0,
            totalAmount,
            paymentMethod: sale.paymentMethod,
            status: "ISSUED",
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          invoice = await prisma.invoice.findUnique({
            where: {
              saleId: sale.id,
            },
          });
        }

        if (!invoice) {
          throw error;
        }
      }
    }

    return NextResponse.json({
      invoice,
      company,
      sale,
    });
  } catch (error) {
    console.error("ERRO API INVOICE:", error);

    return NextResponse.json(
      { message: "Erro ao carregar factura." },
      { status: 500 }
    );
  }
}