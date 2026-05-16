import { prisma } from "@/lib/prisma";

export async function buildAiDashboardData(companyId: string) {
  const [products, cantinas, sales, costs, purchases, notifications] =
    await Promise.all([
      prisma.product.findMany({
        where: { companyId },
        include: { centralStock: true },
      }),

      prisma.cantina.findMany({
        where: { companyId },
      }),

      prisma.sale.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      prisma.cost.findMany({
        where: { companyId },
        orderBy: { costDate: "desc" },
        take: 50,
      }),

      prisma.purchase.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      prisma.notification.findMany({
        where: { companyId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const lowStockProducts = products.filter((product) => {
    const quantity = product.centralStock?.quantity || 0;
    return quantity <= product.minStock;
  });

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount || 0),
    0
  );

  const totalCosts = costs.reduce(
    (sum, cost) => sum + Number(cost.amount || 0),
    0
  );

  const profit = totalSales - totalCosts;

  const alerts = [
    ...lowStockProducts.map((product) => ({
      notification_type: "STOCK_LOW",
      level: "high",
      title: `Stock baixo: ${product.name}`,
      message: `O produto ${product.name} está abaixo ou próximo do stock mínimo.`,
    })),

    ...(profit < 0
      ? [
          {
            notification_type: "FINANCE_RISK",
            level: "critical",
            title: "Lucro negativo",
            message:
              "As despesas recentes estão superiores às vendas. É necessário analisar os custos.",
          },
        ]
      : []),

    ...notifications.map((notification) => ({
      notification_type: notification.type,
      level: "medium",
      title: notification.title,
      message: notification.message,
    })),
  ];

  return {
    alerts,
    reasoning: {
      main_explanation:
        "A IA analisou vendas, custos, compras, cantinas, produtos e notificações recentes do ERP.",
      risk_interpretation:
        profit < 0
          ? "A empresa apresenta risco financeiro no período analisado."
          : "A situação financeira geral parece positiva no período analisado.",
      memory_context:
        "A memória IA ainda está em fase inicial. As próximas análises poderão considerar decisões anteriores e histórico da empresa.",
      priority_explanation: [
        {
          title: "Controlar stock",
          reason:
            lowStockProducts.length > 0
              ? "Existem produtos com stock baixo que podem afetar as vendas."
              : "O stock central não apresenta problemas críticos imediatos.",
        },
        {
          title: "Acompanhar rentabilidade",
          reason:
            "A comparação entre vendas e custos permite identificar riscos de perda.",
        },
      ],
      recommendation_explanation: [
        {
          recommendation: "Repor produtos críticos",
          reason:
            "Produtos abaixo do stock mínimo devem ser priorizados para evitar rutura.",
        },
        {
          recommendation: "Analisar despesas recentes",
          reason:
            "Custos elevados reduzem a margem e podem afetar o crescimento.",
        },
      ],
    },
    memory_summary: {
      summary: "Primeira ligação entre IA e ERP concluída.",
      count: 0,
      categories: {
        stock: lowStockProducts.length,
        finance: profit < 0 ? 1 : 0,
      },
    },
  };
}