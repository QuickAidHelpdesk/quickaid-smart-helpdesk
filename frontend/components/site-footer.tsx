import { ModeToggle } from "@/components/mode-toggle";

export function SiteFooter() {
  return (
    <footer className="py-6 border-t">
      <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} QuickAid Helpdesk. All rights
          reserved.
        </p>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <ModeToggle />
        </div>
      </div>
    </footer>
  );
}
