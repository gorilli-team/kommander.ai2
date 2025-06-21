"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Input } from "@/frontend/components/ui/input";
import { Badge } from "@/frontend/components/ui/badge";

export default function ChatPreview() {
  return (
    <div className="border rounded-lg shadow-md flex flex-col h-full">
      <div className="bg-[#1E3A8A] text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
        <span className="font-semibold">Kommander.ai – Trial</span>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white border-none">Online</Badge>
          <span className="text-sm">20 Giu 2025</span>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-muted rounded-lg p-3 text-sm max-w-xs"
        >
          Ciao! Sono Kommander.ai, come posso aiutarti oggi?
        </motion.div>
        <div className="mt-auto pt-4">
          <div className="relative">
            <Input placeholder="Scrivi qui…" className="pr-10" />
            <Send className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
