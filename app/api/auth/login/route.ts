import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Identificação e senha obrigatórias." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { identifier },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Conta inexistente ou inativa." },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json(
        { message: "Senha incorreta." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signSession({
      userId: user.id,
      companyId: user.companyId,
      cantinaId: user.cantinaId,
      role: user.role,
      identifier: user.identifier,
    });

    const res = NextResponse.json({
      message: "Conexão bem-sucedida.",
      role: user.role,
      redirectTo: user.role === "ADMIN" ? "/Dashboard" : "/vendas",
    });

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
      { message: "Erro servidor." },
      { status: 500 }
    );
  }
}