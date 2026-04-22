import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_ICON: Record<string, React.ReactNode> = {
  READY: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  FAILED: <XCircle className="h-4 w-4 text-red-400" />,
  PROCESSING: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  PENDING: <Clock className="h-4 w-4 text-amber-400" />,
};

const STATUS_LABEL: Record<string, string> = {
  READY: "text-emerald-400",
  FAILED: "text-red-400",
  PROCESSING: "text-blue-400",
  PENDING: "text-amber-400",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminMaterialsPage() {
  const materials = await prisma.courseMaterial.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        select: {
          title: true,
          code: true,
          owner: { select: { email: true } },
        },
      },
      _count: { select: { chunks: true } },
    },
  });

  const byStatus = materials.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Materials</h1>
          <p className="text-sm text-gray-500 mt-1">{materials.length} files uploaded across all courses</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {Object.entries(byStatus).map(([status, count]) => (
            <span key={status} className={`flex items-center gap-1 ${STATUS_LABEL[status] ?? "text-gray-400"}`}>
              {STATUS_ICON[status]}
              {count} {status.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Chunks</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Size</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-gray-200 truncate max-w-[200px]">{m.filename}</div>
                  <div className="text-gray-500 text-xs">{m.mimeType}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-gray-300">{m.course.title}</div>
                  <div className="text-gray-500 text-xs">{m.course.code}</div>
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">{m.course.owner.email}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-center gap-1.5">
                    {STATUS_ICON[m.status]}
                    <span className={`text-xs font-medium ${STATUS_LABEL[m.status] ?? "text-gray-400"}`}>
                      {m.status}
                    </span>
                  </div>
                  {m.error && (
                    <div className="text-red-400 text-xs mt-1 text-center truncate max-w-[120px]" title={m.error}>
                      {m.error.slice(0, 40)}…
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center text-gray-300">{m._count.chunks}</td>
                <td className="px-5 py-3.5 text-right text-gray-400 text-xs">{formatSize(m.size)}</td>
                <td className="px-5 py-3.5 text-right text-gray-500 text-xs whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
