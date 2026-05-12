
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajuste
import { hashPassword, signSession } from "@/lib/auth";
import { dummyRecoveryEmail, looksLikeEmail, normalizeEmail } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const companyName: string | undefined = body?.companyName;
    const identifier: string | undefined = body?.identifier; // admin@slug
    const emailOrPhone: string | undefined = body?.emailOrPhone;
    const password: string | undefined = body?.password;

    const country: string | undefined = body?.country;
    const currency: string | undefined = body?.currency;
    const language: string | undefined = body?.language;

    if (!companyName || !identifier || !emailOrPhone || !password || !country || !currency || !language) {
      return NextResponse.json({ message: "Dados em falta." }, { status: 400 });
    }

    // valida tamanho password mínimo
    if (password.length < 6) {
      return NextResponse.json({ message: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { identifier } });
    if (existing) {
      return NextResponse.json({ message: "Já existe uma conta com esse identificador." }, { status: 409 });
    }

    const input = emailOrPhone.trim();

    const isEmail = looksLikeEmail(input);

    const recoveryEmail = isEmail ? normalizeEmail(input) : dummyRecoveryEmail(identifier);
    const recoveryPhone = isEmail ? null : input;

    // slug = parte do identifier depois de "admin@"
    const slug = identifier.replace(/^admin@/i, "");

    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        slug: slug.trim(),
        recoveryEmail,
        recoveryPhone,
        country,
        currency,
        language,
      },
      select: { id: true },
    });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        cantinaId: null,
        name: `Admin ${companyName.trim()}`,
        identifier,
        passwordHash,
        role: "ADMIN",
      },
      select: { id: true, companyId: true, role: true },
    });

    // criar sessão (para login direto após cadastro)
    const token = signSession({
  userId: user.id,
  companyId: user.companyId,
  role: user.role,
  identifier,
});

    const res = NextResponse.json({ message: "Conta criada com sucesso." }, { status: 201 });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: unknown) {
  console.error(err);

  const message =
    err instanceof Error
      ? err.message
      : "Erro ao criar conta.";

  return NextResponse.json(
    { message },
    { status: 500 }
  );
}
 
}
