import { Image } from 'lucide-react';

interface ProofImagePanelProps {
  title: string;
  url: string | null;
}

export default function ProofImagePanel({ title, url }: ProofImagePanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
        <Image className="h-4 w-4 text-blue-600" />
        {title}
      </div>
      {url ? (
        <img src={url} alt={title} className="aspect-video w-full rounded-xl border border-slate-200 object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
          Chưa có ảnh
        </div>
      )}
    </div>
  );
}
