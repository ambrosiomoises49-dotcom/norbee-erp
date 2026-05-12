import InvoiceClient from "@/features/invoices/InvoiceClient";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;

  return <InvoiceClient saleId={saleId} />;
}