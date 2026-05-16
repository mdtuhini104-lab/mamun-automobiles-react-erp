import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const downloadElementAsPdf = async (elementOrId, fileName) => {
    const element = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!element) {
        throw new Error('Printable content was not found.');
    }

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imageWidth = usableWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/png');

    if (imageHeight <= usableHeight) {
        pdf.addImage(imageData, 'PNG', margin, margin, imageWidth, imageHeight, undefined, 'FAST');
        pdf.save(fileName);
        return;
    }

    const pageCanvas = document.createElement('canvas');
    const pageContext = pageCanvas.getContext('2d');
    const sliceHeightPx = Math.floor((usableHeight * canvas.width) / usableWidth);

    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
        pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.fillStyle = '#ffffff';
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            Math.min(sliceHeightPx, canvas.height - renderedHeight),
            0,
            0,
            canvas.width,
            Math.min(sliceHeightPx, canvas.height - renderedHeight)
        );

        if (pageIndex > 0) {
            pdf.addPage();
        }

        const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - renderedHeight);
        const renderedMmHeight = (currentSliceHeight * imageWidth) / canvas.width;
        pdf.addImage(
            pageCanvas.toDataURL('image/png'),
            'PNG',
            margin,
            margin,
            imageWidth,
            renderedMmHeight,
            undefined,
            'FAST'
        );

        renderedHeight += currentSliceHeight;
        pageIndex += 1;
    }

    pdf.save(fileName);
};

export default downloadElementAsPdf;
