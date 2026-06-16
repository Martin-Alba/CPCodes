// Marca de la web: "CP" en negrita y "Codes" en peso normal.
export default function Brand({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold">CP</span>
      <span className="font-normal">Codes</span>
    </span>
  );
}
