import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  minWidth?: number;
}

export default function DataTable<T>({ rows, columns, getRowKey, minWidth = 860 }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-600">
            {columns.map(column => (
              <th key={column.key} className={`px-4 py-3 font-bold ${column.className ?? ''}`}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={getRowKey(row)} className="border-b border-slate-100 hover:bg-slate-50">
              {columns.map(column => (
                <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
