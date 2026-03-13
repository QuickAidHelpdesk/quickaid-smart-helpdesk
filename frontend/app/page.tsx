import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Signature } from "@/components/signature";

import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 flex items-center justify-center">
        <section className="container mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center">
          <div className="mb-4 flex justify-center w-full">
            <Signature
              className="dark:invert"
              text="QuickAid"
              fontSize={48}
              height={200}
              color="#000000"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mb-6">
            Smart Campus Helpdesk
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            A comprehensive, cloud-native solution designed to streamline
            support ticket submission, status tracking, and automated
            notifications. Built for scale, efficiency, and secure data
            management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <Button
                size="lg"
                variant="outline"
                className="px-8 font-medium cursor-pointer"
              >
                Learn More <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="px-8 font-medium cursor-pointer">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
