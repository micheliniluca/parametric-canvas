export async function captureSvgToClipboard(svgElement: SVGSVGElement, mode: 'grid' | 'white' | 'transparent' = 'grid') {
    try {
        // Clone to manipulate without affecting live UI
        const clone = svgElement.cloneNode(true) as SVGSVGElement;

        // Hide grid if requested
        if (mode === 'white' || mode === 'transparent') {
            const grid = clone.querySelector('#grid-layer') as HTMLElement;
            if (grid) grid.style.display = 'none';
        }

        const svgData = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const canvas = document.createElement('canvas');
        const bbox = svgElement.getBoundingClientRect();
        canvas.width = bbox.width;
        canvas.height = bbox.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Handle background
        if (mode === 'white' || mode === 'grid') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                alert('Screenshot copied to clipboard!');
            } catch (err) {
                console.error('Clipboard error:', err);
                alert('Failed to copy to clipboard. Check permissions.');
            }
        }, 'image/png');

    } catch (error) {
        console.error('Capture error:', error);
        alert('Error capturing screenshot.');
    }
}
