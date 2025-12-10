/**
 * PDF Export Service
 * Handles HTML to PDF conversion and file downloads
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFOptions } from '@/types/template';

export interface ExportService {
  generatePDF(htmlContent: string, options?: PDFOptions): Promise<Blob>;
  preparePrintView(htmlContent: string, orientation?: 'portrait' | 'landscape'): string;
  downloadFile(blob: Blob, filename: string): void;
}

export class PDFExportService {
  
  /**
   * Default PDF options
   */
  private static readonly DEFAULT_PDF_OPTIONS: PDFOptions = {
    format: 'A4',
    orientation: 'portrait',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true
  };

  /**
   * Generate PDF from HTML content
   */
  static async generatePDF(htmlContent: string, options?: PDFOptions): Promise<Blob> {
    try {
      const pdfOptions = { ...this.DEFAULT_PDF_OPTIONS, ...options };
      
      // Create a temporary container for the HTML content
      const container = this.createTemporaryContainer(htmlContent);
      document.body.appendChild(container);

      try {
        // Convert HTML to canvas
        const canvas = await html2canvas(container, {
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: container.scrollWidth,
          height: container.scrollHeight
        });

        // Calculate PDF dimensions
        const imgWidth = pdfOptions.format === 'A4' ? 210 : 216; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Create PDF
        const pdf = new jsPDF({
          orientation: pdfOptions.orientation,
          unit: 'mm',
          format: pdfOptions.format.toLowerCase() as 'a4' | 'letter'
        });

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Handle multi-page documents if needed
        if (imgHeight > pdf.internal.pageSize.height) {
          let position = 0;
          const pageHeight = pdf.internal.pageSize.height;
          
          while (position < imgHeight) {
            if (position > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(
              imgData, 
              'PNG', 
              0, 
              -position, 
              imgWidth, 
              imgHeight
            );
            
            position += pageHeight;
          }
        }

        // Convert to blob
        const pdfBlob = pdf.output('blob');
        return pdfBlob;

      } finally {
        // Clean up temporary container
        document.body.removeChild(container);
      }

    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare HTML content for print view
   */
  static preparePrintView(htmlContent: string, orientation: 'portrait' | 'landscape' = 'portrait'): string {
    // Add comprehensive print-specific styles
    const printStyles = `
      <style>
        @media print {
          /* Reset and base styles */
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
            overflow: visible;
          }
          
          body {
            padding: 20mm;
            box-sizing: border-box;
          }
          
          /* Page setup for A4 */
          @page {
            size: A4 ${orientation};
            margin: 20mm;
            orphans: 3;
            widows: 3;
          }
          
          /* Ensure content is not cut off */
          * {
            box-sizing: border-box;
          }
          
          /* Prevent content from being cut */
          .page, .document-area, [class*="page"], [class*="document"] {
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: visible;
          }
          
          /* Print visibility controls */
          .no-print, .no-print *, 
          nav, .navbar, .sidebar, .header, .footer,
          .btn, button, .controls, .toolbar, .menu,
          .pagination, .breadcrumb, .alert, .toast,
          input[type="button"], input[type="submit"], input[type="reset"] {
            display: none !important;
            visibility: hidden !important;
          }
          
          .print-only {
            display: block !important;
            visibility: visible !important;
          }
          
          /* Page break controls */
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .keep-together {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Typography for print */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
            margin-top: 0;
            margin-bottom: 0.5em;
            font-weight: bold;
            color: #000;
          }
          
          h1 { font-size: 18pt; }
          h2 { font-size: 16pt; }
          h3 { font-size: 14pt; }
          h4 { font-size: 12pt; }
          h5 { font-size: 11pt; }
          h6 { font-size: 10pt; }
          
          p {
            margin: 0 0 0.5em 0;
            orphans: 3;
            widows: 3;
          }
          
          /* Table styles for print */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.5em 0;
            page-break-inside: avoid;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 4pt 8pt;
            text-align: left;
            vertical-align: top;
            font-size: 10pt;
          }
          
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold;
            page-break-after: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          /* Image handling */
          img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid;
          }
          
          /* List styles */
          ul, ol {
            margin: 0.5em 0;
            padding-left: 20pt;
          }
          
          li {
            margin: 0.2em 0;
          }
          
          /* Link styles */
          a {
            color: #000 !important;
            text-decoration: underline;
          }
          
          a[href]:after {
            content: " (" attr(href) ")";
            font-size: 9pt;
            color: #666;
          }
          
          /* Form elements */
          input, textarea, select {
            border: 1px solid #000;
            background: #fff;
            color: #000;
          }
          
          /* Specific document styles */
          .document-header {
            text-align: center;
            margin-bottom: 20pt;
            page-break-after: avoid;
          }
          
          .document-footer {
            margin-top: 20pt;
            page-break-before: avoid;
          }
          
          .signature-section {
            margin-top: 30pt;
            page-break-inside: avoid;
          }
          
          .letterhead {
            text-align: center;
            margin-bottom: 20pt;
            page-break-after: avoid;
          }
          
          .student-photo {
            float: right;
            margin: 0 0 10pt 10pt;
            max-width: 120pt;
            max-height: 150pt;
          }
          
          /* ID Card specific styles */
          .id-card {
            width: 85.6mm;
            height: 53.98mm;
            border: 2pt solid #000;
            padding: 5mm;
            margin: 10mm auto;
            page-break-inside: avoid;
          }
          
          /* Certificate specific styles */
          .certificate {
            border: 3pt double #000;
            padding: 20mm;
            margin: 10mm;
            text-align: center;
            page-break-inside: avoid;
          }
          
          /* Transcript specific styles */
          .transcript-table {
            width: 100%;
            font-size: 9pt;
          }
          
          .transcript-table th,
          .transcript-table td {
            padding: 2pt 4pt;
            border: 0.5pt solid #000;
          }
          
          /* Utility classes */
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
          
          .font-bold { font-weight: bold; }
          .font-italic { font-style: italic; }
          .font-underline { text-decoration: underline; }
          
          .margin-top { margin-top: 10pt; }
          .margin-bottom { margin-bottom: 10pt; }
          .no-margin { margin: 0; }
          
          /* Hide interactive elements */
          .interactive, .hover-effect, .tooltip,
          .dropdown, .modal, .popup, .overlay {
            display: none !important;
          }
        }
        
        @media screen {
          .print-only {
            display: none;
          }
          
          .print-preview {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      </style>
    `;

    // Process HTML content for better print compatibility (preserves original styles)
    const { bodyContent, styles, links } = this.processContentForPrint(htmlContent);

    // Combine styles with content - original styles first, then print styles
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="robots" content="noindex, nofollow">
          <title>Document Print View</title>
          <style>
            /* Base styles for print window */
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              min-height: 100%;
              overflow: visible;
            }
            body {
              padding: 20mm;
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
            
            /* Print controls toolbar */
            .print-controls {
              position: fixed;
              top: 10px;
              right: 10px;
              z-index: 10000;
              background: white;
              border: 2px solid #333;
              border-radius: 8px;
              padding: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              gap: 8px;
              align-items: center;
            }
            
            .print-controls button {
              padding: 8px 16px;
              border: 1px solid #ccc;
              border-radius: 4px;
              background: #f5f5f5;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s;
            }
            
            .print-controls button:hover {
              background: #e0e0e0;
              border-color: #999;
            }
            
            .print-controls button.active {
              background: #007bff;
              color: white;
              border-color: #007bff;
            }
            
            .print-controls .orientation-label {
              font-weight: 600;
              margin-right: 8px;
              color: #333;
            }
            
            @media print {
              .print-controls {
                display: none !important;
              }
            }
          </style>
          ${links}
          ${styles}
          ${printStyles}
        </head>
        <body style="margin: 0; padding: 20mm; width: 100%; min-height: 100%; overflow: visible;">
          <div class="print-controls">
            <span class="orientation-label">Orientation:</span>
            <button id="btn-portrait" class="${orientation === 'portrait' ? 'active' : ''}" onclick="setOrientation('portrait')">
              📄 Vertical (Portrait)
            </button>
            <button id="btn-landscape" class="${orientation === 'landscape' ? 'active' : ''}" onclick="setOrientation('landscape')">
              📄 Horizontal (Landscape)
            </button>
            <button onclick="window.print()" style="background: #28a745; color: white; border-color: #28a745; margin-left: 8px;">
              🖨️ Print
            </button>
          </div>
          ${bodyContent}
          <script>
            let currentOrientation = '${orientation}';
            
            function setOrientation(orient) {
              currentOrientation = orient;
              
              // Update button states
              document.getElementById('btn-portrait').classList.toggle('active', orient === 'portrait');
              document.getElementById('btn-landscape').classList.toggle('active', orient === 'landscape');
              
              // Update @page rule
              const style = document.createElement('style');
              style.textContent = '@page { size: A4 ' + orient + '; margin: 20mm; } @media print { @page { size: A4 ' + orient + '; margin: 20mm; } }';
              
              // Remove old orientation style if exists
              const oldStyle = document.getElementById('orientation-style');
              if (oldStyle) {
                oldStyle.remove();
              }
              
              style.id = 'orientation-style';
              document.head.appendChild(style);
              
              // Update body class for visual feedback
              document.body.className = 'orientation-' + orient;
            }
            
            // Apply initial orientation
            if (currentOrientation === 'landscape') {
              setOrientation('landscape');
            }
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Process HTML content for better print compatibility
   * Preserves original template styles while adding print enhancements
   */
  private static processContentForPrint(htmlContent: string): { bodyContent: string; styles: string; links: string } {
    let processed = htmlContent;

    // Extract and preserve original styles from the template
    const styleMatches = processed.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    const linkMatches = processed.match(/<link[^>]*>/gi) || [];
    
    // Extract the body content (everything between <body> tags or the entire content if no body tag)
    let bodyContent = processed;
    const bodyMatch = processed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }

    // Remove style and link tags from body content (they'll be in head)
    bodyContent = bodyContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<link[^>]*>/gi, '');

    // Add page break classes to large sections (only if not already present)
    bodyContent = bodyContent.replace(
      /<div class="([^"]*section[^"]*)(?!.*page-break)">/gi,
      '<div class="$1 page-break-inside-avoid">'
    );

    // Ensure images have proper print classes (only if not already present)
    bodyContent = bodyContent.replace(
      /<img((?![^>]*class="[^"]*page-break)[^>]*)>/gi,
      '<img$1 class="page-break-inside-avoid">'
    );

    // Add print-friendly table classes (only if not already present)
    bodyContent = bodyContent.replace(
      /<table((?![^>]*class="[^"]*page-break)[^>]*)>/gi,
      '<table$1 class="page-break-inside-avoid">'
    );

    // Remove only script tags (keep everything else)
    bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    return {
      bodyContent: bodyContent.trim(),
      styles: styleMatches.join('\n'),
      links: linkMatches.join('\n')
    };
  }

  /**
   * Download file to user's device
   */
  static downloadFile(blob: Blob, filename: string): void {
    try {
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error(`File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate filename with student and document type information
   */
  static generateFilename(studentName: string, documentType: string, extension: string = 'pdf'): string {
    // Clean and format names
    const cleanStudentName = studentName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
    
    const cleanDocumentType = documentType
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    // Add timestamp for uniqueness
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return `${cleanStudentName}_${cleanDocumentType}_${timestamp}.${extension}`;
  }

  /**
   * Validate PDF generation requirements
   */
  static validatePDFRequirements(htmlContent: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!htmlContent || htmlContent.trim() === '') {
      errors.push('HTML content is required for PDF generation');
    }

    if (htmlContent.length > 1000000) { // 1MB limit
      errors.push('HTML content is too large for PDF generation');
    }

    // Check for problematic elements
    const problematicElements = ['<script', '<iframe', '<embed', '<object'];
    for (const element of problematicElements) {
      if (htmlContent.includes(element)) {
        errors.push(`PDF generation may fail due to ${element} elements`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get PDF generation options for different document types
   */
  static getDocumentTypeOptions(documentType: string): PDFOptions {
    const baseOptions = { ...this.DEFAULT_PDF_OPTIONS };

    switch (documentType.toLowerCase()) {
      case 'idcard':
        return {
          ...baseOptions,
          format: 'A4',
          orientation: 'portrait',
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          }
        };
      
      case 'transcript':
        return {
          ...baseOptions,
          format: 'A4',
          orientation: 'portrait',
          margin: {
            top: '25mm',
            right: '20mm',
            bottom: '25mm',
            left: '20mm'
          }
        };
      
      case 'testimonial':
      case 'character':
      case 'clearance':
      case 'bonafide':
      case 'eligibility':
        return {
          ...baseOptions,
          format: 'A4',
          orientation: 'portrait'
        };
      
      default:
        return baseOptions;
    }
  }

  /**
   * Create temporary container for HTML content
   */
  private static createTemporaryContainer(htmlContent: string): HTMLElement {
    const container = document.createElement('div');
    
    // Set container styles for proper rendering
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.minHeight = '297mm'; // A4 height
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '20mm';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.4';
    container.style.color = '#000000';
    
    // Set content
    container.innerHTML = htmlContent;
    
    return container;
  }

  /**
   * Estimate PDF file size
   */
  static estimatePDFSize(htmlContent: string): number {
    // Rough estimation based on content length
    const baseSize = 50000; // 50KB base size
    const contentFactor = htmlContent.length * 0.5; // 0.5 bytes per character
    const imageFactor = (htmlContent.match(/<img/g) || []).length * 100000; // 100KB per image
    
    return Math.round(baseSize + contentFactor + imageFactor);
  }

  /**
   * Check browser compatibility for PDF generation
   */
  static checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for required APIs
    if (!window.URL || !window.URL.createObjectURL) {
      issues.push('Browser does not support URL.createObjectURL');
    }

    if (!document.createElement('canvas').getContext) {
      issues.push('Browser does not support HTML5 Canvas');
    }

    if (!window.Blob) {
      issues.push('Browser does not support Blob API');
    }

    // Check for html2canvas requirements
    if (!window.HTMLCanvasElement) {
      issues.push('Browser does not support HTMLCanvasElement');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Open print dialog with optimized content
   */
  static openPrintDialog(htmlContent: string, documentType?: string, orientation: 'portrait' | 'landscape' = 'portrait'): void {
    try {
      const printContent = this.preparePrintView(htmlContent, orientation);
      
      const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please check your browser popup settings.');
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = () => {
        // Don't auto-print, let user choose orientation first
        // User can click Print button in the print controls
      };

    } catch (error) {
      throw new Error(`Print dialog failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate print requirements
   */
  static validatePrintRequirements(htmlContent: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for A4 compatibility
    if (!htmlContent.includes('210mm') && !htmlContent.includes('A4')) {
      warnings.push('Content may not be optimized for A4 paper size');
    }

    // Check for print styles
    if (!htmlContent.includes('@media print') && !htmlContent.includes('print-only')) {
      warnings.push('No print-specific styles detected');
    }

    // Check for large images
    const imageMatches = htmlContent.match(/<img[^>]*>/gi);
    if (imageMatches && imageMatches.length > 5) {
      warnings.push('Multiple images detected - may affect print quality');
    }

    // Check for interactive elements
    const interactiveElements = ['<button', '<input', '<select', '<textarea'];
    for (const element of interactiveElements) {
      if (htmlContent.includes(element)) {
        warnings.push('Interactive elements detected - may not print properly');
        break;
      }
    }

    return {
      isValid: true, // Print should always be attempted
      warnings
    };
  }

  /**
   * Get print preview HTML
   */
  static getPrintPreview(htmlContent: string, orientation: 'portrait' | 'landscape' = 'portrait'): string {
    const printContent = this.preparePrintView(htmlContent, orientation);
    
    // Add preview-specific styles
    const previewStyles = `
      <style>
        body {
          background: #f5f5f5 !important;
          padding: 20px !important;
        }
        
        .print-preview-container {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          padding: 20mm;
        }
        
        .print-preview-header {
          background: #333;
          color: white;
          padding: 10px;
          text-align: center;
          margin: -20px -20px 20px -20px;
          font-family: Arial, sans-serif;
        }
      </style>
    `;

    return printContent.replace(
      '</head>',
      `${previewStyles}</head>`
    ).replace(
      '<body>',
      `<body>
        <div class="print-preview-container">
          <div class="print-preview-header">Print Preview - A4 Format</div>`
    ).replace(
      '</body>',
      `</div></body>`
    );
  }

  /**
   * Check if content fits on single page
   */
  static estimatePageCount(htmlContent: string): number {
    // Rough estimation based on content length and structure
    const textLength = htmlContent.replace(/<[^>]*>/g, '').length;
    const imageCount = (htmlContent.match(/<img/g) || []).length;
    const tableCount = (htmlContent.match(/<table/g) || []).length;
    
    // A4 page can hold approximately 3000 characters of text
    const textPages = Math.ceil(textLength / 3000);
    const imagePages = Math.ceil(imageCount * 0.3); // Assume images take 30% of a page
    const tablePages = Math.ceil(tableCount * 0.5); // Assume tables take 50% of a page
    
    return Math.max(1, textPages + imagePages + tablePages);
  }

  /**
   * Optimize content for print
   */
  static optimizeForPrint(htmlContent: string, documentType?: string): string {
    let optimized = htmlContent;

    // Add document type specific optimizations
    if (documentType) {
      switch (documentType.toLowerCase()) {
        case 'idcard':
          optimized = this.optimizeIDCardForPrint(optimized);
          break;
        case 'certificate':
        case 'testimonial':
          optimized = this.optimizeCertificateForPrint(optimized);
          break;
        case 'transcript':
          optimized = this.optimizeTranscriptForPrint(optimized);
          break;
      }
    }

    // General optimizations
    optimized = this.applyGeneralPrintOptimizations(optimized);

    return optimized;
  }

  /**
   * Optimize ID card for print
   */
  private static optimizeIDCardForPrint(htmlContent: string): string {
    // Add ID card specific classes and structure
    return htmlContent
      .replace(/<div([^>]*class="[^"]*card[^"]*"[^>]*)>/gi, '<div$1 class="id-card page-break-inside-avoid">')
      .replace(/<img([^>]*class="[^"]*photo[^"]*"[^>]*)>/gi, '<img$1 class="student-photo">');
  }

  /**
   * Optimize certificate for print
   */
  private static optimizeCertificateForPrint(htmlContent: string): string {
    return htmlContent
      .replace(/<div([^>]*class="[^"]*certificate[^"]*"[^>]*)>/gi, '<div$1 class="certificate page-break-inside-avoid">')
      .replace(/<div([^>]*class="[^"]*signature[^"]*"[^>]*)>/gi, '<div$1 class="signature-section">');
  }

  /**
   * Optimize transcript for print
   */
  private static optimizeTranscriptForPrint(htmlContent: string): string {
    return htmlContent
      .replace(/<table([^>]*)>/gi, '<table$1 class="transcript-table">')
      .replace(/<tr([^>]*)>/gi, '<tr$1 class="page-break-inside-avoid">');
  }

  /**
   * Apply general print optimizations
   */
  private static applyGeneralPrintOptimizations(htmlContent: string): string {
    return htmlContent
      // Add page break avoidance to headers
      .replace(/<(h[1-6])([^>]*)>/gi, '<$1$2 class="page-break-after-avoid">')
      // Add keep-together to paragraphs
      .replace(/<p([^>]*)>/gi, '<p$1 class="keep-together">')
      // Optimize images
      .replace(/<img([^>]*)>/gi, '<img$1 class="print-optimized">');
  }

  /**
   * Generate PDF with error recovery
   */
  static async generatePDFWithFallback(
    htmlContent: string, 
    options?: PDFOptions
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      // Check browser compatibility first
      const compatibility = this.checkBrowserCompatibility();
      if (!compatibility.compatible) {
        return {
          success: false,
          error: `Browser compatibility issues: ${compatibility.issues.join(', ')}`
        };
      }

      // Validate content
      const validation = this.validatePDFRequirements(htmlContent);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Content validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Generate PDF
      const blob = await this.generatePDF(htmlContent, options);
      
      return {
        success: true,
        blob
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}