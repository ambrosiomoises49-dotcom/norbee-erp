import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;
import {
  hashPassword,
  signSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import {
  dummyRecoveryEmail,
  looksLikeEmail,
  normalizeEmail,
} from "@/lib/utils";



function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}



export async function POST(req: Request) {
  try {
    const body = await req.json();

    const companyName: string | undefined = body?.companyName;
    const emailOrPhone: string | undefined = body?.emailOrPhone;
    const password: string | undefined = body?.password;

    const country: string | undefined = body?.country?.trim()?.toUpperCase();
    const currency: string | undefined = body?.currency?.trim()?.toUpperCase();
    const language: string | undefined = body?.language;

    if (
      !companyName ||
      !emailOrPhone ||
      !password ||
      !country ||
      !currency ||
      !language
    ) {
      return NextResponse.json(
        { message: "Dados em falta." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const slug = cleanSlug(companyName);

    if (!slug) {
      return NextResponse.json(
        { message: "Nome da empresa inválido." },
        { status: 400 }
      );
    }

    const identifier = `admin@${slug}`;

    const existingCompany = await prisma.company.findUnique({
      where: { slug },
    });

    if (existingCompany) {
      return NextResponse.json(
        { message: "Já existe uma empresa com este nome." },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { identifier },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Já existe uma conta com esse identificador." },
        { status: 409 }
      );
    }

    const input = emailOrPhone.trim();
    const isEmail = looksLikeEmail(input);

    const recoveryEmail = isEmail
      ? normalizeEmail(input)
      : dummyRecoveryEmail(identifier);

    const recoveryPhone = isEmail ? null : input;

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          slug,
          recoveryEmail,
          recoveryPhone,
          country,
          currency,
          language,
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          cantinaId: null,
          name: `Admin ${companyName.trim()}`,
          identifier,
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
        },
      });

      return { company, user };
    });

    const token = signSession({
      userId: result.user.id,
      companyId: result.user.companyId,
      cantinaId: result.user.cantinaId,
      role: result.user.role,
      identifier: result.user.identifier,
    });

    const res = NextResponse.json(
      {
        message: "Conta criada com sucesso.",
        identifier,
        redirectTo: "/dashboard",
      },
      { status: 201 }
    );

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao criar conta." },
      { status: 500 }
    );
  }
}
