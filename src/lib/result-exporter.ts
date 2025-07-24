import type { SearchResult } from '../types/pokemon';

/**
 * Export functionality for search results
 * Supports CSV, JSON, and text formats
 */

export interface ExportOptions {
  format: 'csv' | 'json' | 'txt';
  includeDetails?: boolean;
  includeMessage?: boolean;
  includeHash?: boolean;
}

export class ResultExporter {
  
  /**
   * Export search results in the specified format
   */
  public static exportResults(results: SearchResult[], options: ExportOptions): string {
    switch (options.format) {
      case 'csv':
        return this.exportToCSV(results, options);
      case 'json':
        return this.exportToJSON(results, options);
      case 'txt':
        return this.exportToText(results, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private static exportToCSV(results: SearchResult[], options: ExportOptions): string {
    const headers = [
      'Seed',
      'DateTime',
      'Timer0',
      'VCount',
      'ROM',
      'Region',
      'Hardware'
    ];

    if (options.includeDetails) {
      headers.push('MAC Address', 'Key Input');
    }

    if (options.includeMessage) {
      headers.push('Message');
    }

    if (options.includeHash) {
      headers.push('SHA1 Hash');
    }

    const csvLines = [headers.join(',')];

    results.forEach(result => {
      const row = [
        `0x${result.seed.toString(16).padStart(8, '0')}`,
        result.dateTime.toISOString(),
        result.timer0.toString(),
        result.vcount.toString(),
        result.romVersion,
        result.romRegion,
        result.hardware
      ];

      if (options.includeDetails) {
        const macAddress = result.macAddress?.map(b => b.toString(16).padStart(2, '0')).join(':') || '';
        const keyInput = result.keyInput ? `0x${result.keyInput.toString(16).padStart(8, '0')}` : '';
        row.push(macAddress, keyInput);
      }

      if (options.includeMessage) {
        const message = result.message?.map(m => `0x${m.toString(16).padStart(8, '0')}`).join(' ') || '';
        row.push(`"${message}"`);
      }

      if (options.includeHash) {
        row.push(result.hash || '');
      }

      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  }

  /**
   * Export to JSON format
   */
  private static exportToJSON(results: SearchResult[], options: ExportOptions): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalResults: results.length,
      format: 'json',
      results: results.map(result => {
        const exportResult: any = {
          seed: `0x${result.seed.toString(16).padStart(8, '0')}`,
          seedDecimal: result.seed,
          dateTime: result.dateTime.toISOString(),
          timer0: result.timer0,
          vcount: result.vcount,
          rom: {
            version: result.romVersion,
            region: result.romRegion,
            hardware: result.hardware
          }
        };

        if (options.includeDetails) {
          exportResult.macAddress = result.macAddress?.map(b => `0x${b.toString(16).padStart(2, '0')}`);
          exportResult.keyInput = result.keyInput ? `0x${result.keyInput.toString(16).padStart(8, '0')}` : null;
        }

        if (options.includeMessage) {
          exportResult.message = result.message?.map(m => `0x${m.toString(16).padStart(8, '0')}`);
        }

        if (options.includeHash) {
          exportResult.sha1Hash = result.hash;
        }

        return exportResult;
      })
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export to text format
   */
  private static exportToText(results: SearchResult[], options: ExportOptions): string {
    const lines = [
      'Pokemon BW/BW2 Initial Seed Search Results',
      `Export Date: ${new Date().toISOString()}`,
      `Total Results: ${results.length}`,
      '',
      '================================================================'
    ];

    results.forEach((result, index) => {
      lines.push(`Result #${index + 1}:`);
      lines.push(`  Seed: 0x${result.seed.toString(16).padStart(8, '0')} (${result.seed})`);
      lines.push(`  DateTime: ${result.dateTime.toLocaleString()}`);
      lines.push(`  Timer0: ${result.timer0}`);
      lines.push(`  VCount: ${result.vcount}`);
      lines.push(`  ROM: ${result.romVersion} ${result.romRegion} (${result.hardware})`);

      if (options.includeDetails) {
        const macAddress = result.macAddress?.map(b => b.toString(16).padStart(2, '0')).join(':') || 'N/A';
        const keyInput = result.keyInput ? `0x${result.keyInput.toString(16).padStart(8, '0')}` : 'N/A';
        lines.push(`  MAC Address: ${macAddress}`);
        lines.push(`  Key Input: ${keyInput}`);
      }

      if (options.includeHash) {
        lines.push(`  SHA1 Hash: ${result.hash || 'N/A'}`);
      }

      if (options.includeMessage) {
        const message = result.message?.map(m => `0x${m.toString(16).padStart(8, '0')}`).join(' ') || 'N/A';
        lines.push(`  Message: ${message}`);
      }

      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Download a file with the given content
   */
  public static downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Copy content to clipboard
   */
  public static async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate filename based on current date and format
   */
  public static generateFilename(format: 'csv' | 'json' | 'txt', prefix: string = 'pokemon-seeds'): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `${prefix}-${dateStr}-${timeStr}.${format}`;
  }
}
