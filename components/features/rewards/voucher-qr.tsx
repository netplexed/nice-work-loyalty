'use client'

import QRCode from "react-qr-code"

interface VoucherQRProps {
    code: string
    size?: number
    className?: string
}

export function VoucherQR({ code, size = 128, className = "" }: VoucherQRProps) {
    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm border inline-block ${className}`}>
            <QRCode
                size={size}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={code}
                viewBox={`0 0 256 256`}
            />
        </div>
    )
}
