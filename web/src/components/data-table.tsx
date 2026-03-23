"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  loadingRows?: number;
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}) {
  if (field !== sortField) {
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5" />
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortField,
  sortDirection,
  onSort,
  emptyIcon,
  emptyMessage = "Nessun elemento trovato",
  loading = false,
  loadingRows = 5,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: loadingRows }, (_, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  <Skeleton className="h-4 w-3/4" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState icon={emptyIcon} title={emptyMessage} />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.sortable && onSort ? (
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex items-center hover:text-foreground transition-colors"
                >
                  {col.header}
                  <SortIcon
                    field={col.key}
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              ) : (
                col.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={keyExtractor(row)}>
            {columns.map((col) => (
              <TableCell key={col.key} className={cn(col.className)}>
                {col.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
