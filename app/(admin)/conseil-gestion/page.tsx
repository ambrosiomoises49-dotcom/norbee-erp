import {
  Brain,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

type AiDashboardData = {
  success: boolean;
  metrics: {
    sales: number;
    costs: number;
    profit: number;
    lowStock: number;
    cantinas: number;
    employees: number;
  };
  reasoning: string[];
  recommendations: string[];
};

async function getAiDashboard(): Promise<AiDashboardData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/ai/dashboard`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AiDashboardData;
  } catch {
    return null;
  }
}

export default async function ConseilGestionPage() {
  const data = await getAiDashboard();

  if (!data || !data.success) {
    return <div className="p-6">Impossible de charger l’IA.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#123A5C] to-[#F5C982] p-6 text-white">
        <div className="flex items-center gap-3">
          <Brain size={32} />
          <h1 className="text-3xl font-black">Conseil de Gestion IA</h1>
        </div>

        <p className="mt-2 text-white/80">
          Analyse intelligente connectée aux données réelles de ton ERP.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Ventes" value={data.metrics.sales} />
        <Card title="Coûts" value={data.metrics.costs} />
        <Card title="Profit" value={data.metrics.profit} />
        <Card title="Stock bas" value={data.metrics.lowStock} />
        <Card title="Cantinas" value={data.metrics.cantinas} />
        <Card title="Employés" value={data.metrics.employees} />
      </div>

      <Panel title="Raisonnement IA" icon={<TrendingUp size={20} />}>
        {data.reasoning.map((item, index) => (
          <p key={index} className="rounded-xl bg-slate-50 p-3 text-slate-700">
            {item}
          </p>
        ))}
      </Panel>

      <Panel title="Recommandations IA" icon={<Lightbulb size={20} />}>
        {data.recommendations.map((item, index) => (
          <p key={index} className="rounded-xl bg-yellow-50 p-3 text-slate-700">
            {item}
          </p>
        ))}
      </Panel>

      {data.metrics.lowStock > 0 && (
        <Panel title="Alerte stock" icon={<AlertTriangle size={20} />}>
          <p className="rounded-xl bg-red-50 p-3 text-red-700">
            Certains produits sont sous le seuil minimum. Il faut prévoir un
            réapprovisionnement.
          </p>
        </Panel>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-800">
        {formatValue(value)}
      </h2>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-[#123A5C]">
        {icon}
        <h2 className="text-lg font-black">{title}</h2>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 2,
  }).format(value);
}