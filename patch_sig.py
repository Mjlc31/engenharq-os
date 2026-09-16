with open('src/components/ui/SignaturePadModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');",
    "const dataUrl = sigCanvas.current?.getCanvas().toDataURL('image/png');"
)

with open('src/components/ui/SignaturePadModal.tsx', 'w') as f:
    f.write(content)
