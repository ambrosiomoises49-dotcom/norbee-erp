import CantinaDetailsClient from "@/features/cantinas/components/CantinaDetailsClient";

export default async function CantinaDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CantinaDetailsClient id={id} />;
}