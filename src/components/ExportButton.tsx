import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, Check } from '@phosphor-icons/react';
import { ResultExporter, type ExportOptions } from '../lib/export/result-exporter';
import type { SearchResult } from '../types/pokemon';

interface ExportButtonProps {
  results: SearchResult[];
  disabled?: boolean;
}

export function ExportButton({ results, disabled = false }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeDetails: false,
    includeMessage: false,
    includeHash: true
  });
  const [copied, setCopied] = useState(false);

  const handleExport = async (download: boolean = true) => {
    try {
      const content = ResultExporter.exportResults(results, exportOptions);
      
      if (download) {
        const filename = ResultExporter.generateFilename(exportOptions.format);
        const mimeTypes = {
          csv: 'text/csv',
          json: 'application/json',
          txt: 'text/plain'
        };
        
        ResultExporter.downloadFile(content, filename, mimeTypes[exportOptions.format]);
      } else {
        // Copy to clipboard
        const success = await ResultExporter.copyToClipboard(content);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || results.length === 0}
          className="gap-2"
        >
          <Download size={16} />
          Export ({results.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Search Results</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={exportOptions.format}
              onValueChange={(value: 'csv' | 'json' | 'txt') => updateOption('format', value)}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                <SelectItem value="txt">TXT (Plain Text)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Include Additional Data</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="details"
                checked={exportOptions.includeDetails}
                onCheckedChange={(checked) => updateOption('includeDetails', !!checked)}
              />
              <Label htmlFor="details" className="text-sm font-normal">
                Include MAC address and key input
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hash"
                checked={exportOptions.includeHash}
                onCheckedChange={(checked) => updateOption('includeHash', !!checked)}
              />
              <Label htmlFor="hash" className="text-sm font-normal">
                Include SHA-1 hash
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="message"
                checked={exportOptions.includeMessage}
                onCheckedChange={(checked) => updateOption('includeMessage', !!checked)}
              />
              <Label htmlFor="message" className="text-sm font-normal">
                Include raw message data (technical)
              </Label>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Exporting {results.length} result{results.length !== 1 ? 's' : ''}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => handleExport(true)}
              className="flex-1 gap-2"
            >
              <Download size={16} />
              Download File
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => handleExport(false)}
              className="flex-1 gap-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
