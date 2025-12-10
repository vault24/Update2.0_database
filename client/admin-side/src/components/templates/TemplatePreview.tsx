/**
 * Template Preview Component
 * Displays a live preview of populated document templates
 */

import React, { useState, useRef, useEffect } from 'react';
import { DocumentStudentData } from '@/types/template';
import { TemplateEngine } from '@/utils/templateEngine';
import { PDFExportService } from '@/services/pdfExportService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Printer,
  Download
} from 'lucide-react';

interface TemplatePreviewProps {
  templateContent: string;
  studentData: DocumentStudentData;
  customData?: Partial<DocumentStudentData>;
  onPrint?: () => void;
  onDownload?: () => void;
  className?: string;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  templateContent,
  studentData,
  customData = {},
  onPrint,
  onDownload,
  className = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showEditHighlights, setShowEditHighlights] = useState(false);
  const [populatedContent, setPopulatedContent] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate populated content with error handling
  useEffect(() => {
    if (templateContent && studentData) {
      try {
        const mergedData = { ...studentData, ...customData };
        const content = TemplateEngine.populateTemplate(templateContent, mergedData);
        
        if (!content || content.trim() === '') {
          console.warn('Template population resulted in empty content');
          setPopulatedContent('<div style="padding: 20px; text-align: center; color: #666;">Preview not available - template content is empty</div>');
        } else {
          setPopulatedContent(content);
        }
      } catch (error) {
        console.error('Error generating template preview:', error);
        setPopulatedContent('<div style="padding: 20px; text-align: center; color: #f56565;">Error generating preview</div>');
      }
    }
  }, [templateContent, studentData, customData]);

  // Update iframe content
  useEffect(() => {
    if (iframeRef.current && populatedContent) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(populatedContent);
        doc.close();

        // Apply zoom
        if (doc.body) {
          doc.body.style.zoom = `${zoom}%`;
          doc.body.style.transform = `scale(${zoom / 100})`;
          doc.body.style.transformOrigin = 'top left';
        }

        // Toggle edit highlights
        const editableElements = doc.querySelectorAll('.editable');
        editableElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          if (showEditHighlights) {
            htmlElement.style.backgroundColor = '#ffffcc';
            htmlElement.style.border = '1px dotted #999';
          } else {
            htmlElement.style.backgroundColor = 'transparent';
            htmlElement.style.border = 'none';
          }
        });
      }
    }
  }, [populatedContent, zoom, showEditHighlights]);

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle print
  const handlePrint = () => {
    if (!populatedContent) {
      onPrint?.();
      return;
    }

    try {
      // Prepare print view with only document content
      const printContent = PDFExportService.preparePrintView(populatedContent);
      
      // Open print dialog in new window with proper sizing
      const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please check your browser popup settings.');
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
      
      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow.document.readyState === 'complete') {
          printWindow.print();
        }
      }, 1500);
    } catch (error) {
      console.error('Print error:', error);
      // Fallback to iframe print if available
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.print();
      }
    }
    
    onPrint?.();
  };

  const containerClasses = isFullscreen 
    ? 'fixed inset-0 z-50 bg-background' 
    : className;

  return (
    <div className={containerClasses}>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Document Preview
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="h-7 w-7 p-0"
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                
                <Badge variant="outline" className="text-xs px-2 py-1 min-w-[50px] text-center">
                  {zoom}%
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="h-7 w-7 p-0"
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                
                <Separator orientation="vertical" className="h-4" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomReset}
                  className="h-7 w-7 p-0"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>

              {/* Edit Highlights Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditHighlights(!showEditHighlights)}
                className="flex items-center gap-2"
              >
                {showEditHighlights ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Highlights
              </Button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                
                {onDownload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownload}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center gap-2"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full border-t">
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Document Preview"
              sandbox="allow-same-origin allow-scripts"
              style={{
                backgroundColor: 'white',
                minHeight: isFullscreen ? 'calc(100vh - 120px)' : '600px'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="shadow-lg"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Exit Fullscreen
          </Button>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;