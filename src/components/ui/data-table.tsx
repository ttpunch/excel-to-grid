import * as React from "react";
import { cn } from "@/lib/utils";

const DataTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden rounded-lg border bg-card shadow-elegant",
      className
    )}
    {...props}
  />
));
DataTable.displayName = "DataTable";

const DataTableHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "border-b bg-gradient-primary p-4 text-primary-foreground",
      className
    )}
    {...props}
  />
));
DataTableHeader.displayName = "DataTableHeader";

const DataTableBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("divide-y divide-border", className)}
    {...props}
  />
));
DataTableBody.displayName = "DataTableBody";

const DataTableRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    clickable?: boolean;
  }
>(({ className, clickable = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid gap-0 transition-smooth",
      clickable && "cursor-pointer hover:bg-muted/50 active:bg-muted",
      className
    )}
    {...props}
  />
));
DataTableRow.displayName = "DataTableRow";

const DataTableCell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    header?: boolean;
  }
>(({ className, header = false, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center px-4 py-3 border-r last:border-r-0 min-w-0",
      header && "font-semibold text-sm bg-gradient-primary/10 justify-center text-center",
      !header && "text-sm text-foreground",
      className
    )}
    {...props}
  >
    <span className="break-words w-full">{children}</span>
  </div>
));
DataTableCell.displayName = "DataTableCell";

export { DataTable, DataTableHeader, DataTableBody, DataTableRow, DataTableCell };