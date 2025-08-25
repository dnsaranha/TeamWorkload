import { useState } from "react";
import * as XLSX from "xlsx";

type Summary = {
  created: number;
  updated: number;
  errors: number;
  total: number;
};

type UseImportOptions = {
  onProcessRow: (row: any) => Promise<{ created?: boolean; updated?: boolean }>;
  onComplete?: () => void;
};

export const useImport = ({ onProcessRow, onComplete }: UseImportOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>({
    created: 0,
    updated: 0,
    errors: 0,
    total: 0,
  });
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setSummary({ created: 0, updated: 0, errors: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
          try {
            const result = await onProcessRow(row);
            if (result.created) {
              createdCount++;
            } else if (result.updated) {
              updatedCount++;
            }
          } catch (error) {
            console.error("Error processing row:", error);
            errorCount++;
          }
        }

        setSummary({
          created: createdCount,
          updated: updatedCount,
          errors: errorCount,
          total: jsonData.length,
        });

      } catch (error) {
        console.error("Error reading file:", error);
        setSummary({ created: 0, updated: 0, errors: 1, total: 0 });
      } finally {
        setIsLoading(false);
        setIsSummaryDialogOpen(true);
        if (onComplete) {
          onComplete();
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return {
    isLoading,
    summary,
    isSummaryDialogOpen,
    setIsSummaryDialogOpen,
    handleFileImport,
  };
};
