import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RelativeTime } from '../shared/RelativeTime';
import { ActionBadge } from '../shared/Badges';

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Timestamp',
    cell: info => <RelativeTime date={info.getValue()} />,
  }),
  columnHelper.accessor('actor', {
    header: 'Actor',
    cell: info => (
      <span className="font-mono text-[14px] text-code">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('action', {
    header: 'Action',
    cell: info => <ActionBadge action={info.getValue()} />,
  }),
  columnHelper.accessor('sourceService', {
    header: 'Service',
    cell: info => (
      <span className="font-mono text-[13px] text-muted">{info.getValue()}</span>
    ),
  }),
];

interface EventsTableProps {
  data: any[];
  onRowClick: (event: any) => void;
}

export function EventsTable({ data, onRowClick }: EventsTableProps) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map(h => (
                <th
                  key={h.id}
                  className="px-0 pr-8 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted whitespace-nowrap"
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className="cursor-pointer border-b border-border last:border-b-0 hover:bg-elevated/30 transition-colors"
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="pr-8 py-4 text-[14px] text-primary">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <p className="py-10 text-center font-mono text-[12px] text-muted uppercase tracking-[0.15em]">
          No events found.
        </p>
      )}
    </div>
  );
}
