"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Shield, ClipboardList, Palette } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>In attesa di approvazione</CardTitle>
          <CardDescription>
            La tua registrazione è completa. Il Responsabile Parità deve approvare
            il tuo accesso ai dati crittografati.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground mb-4">
            <p className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <strong className="text-foreground">Cosa succede ora?</strong>
            </p>
            <ul className="ml-6 list-disc space-y-1 text-xs">
              <li>Il responsabile vedrà la tua richiesta nella pagina Team</li>
              <li>Dopo l{"'"}approvazione, riceverai la chiave per decrittare i dati</li>
              <li>Al prossimo login, la chiave verrà sincronizzata automaticamente</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Nel frattempo puoi già accedere alle funzionalità che non richiedono dati crittografati.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => router.push("/rpg/surveys")}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Vai ai moduli
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
