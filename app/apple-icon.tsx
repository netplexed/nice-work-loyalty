import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
    width: 180, // Apple standard
    height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 100,
                    background: 'black',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                }}
            >
                NW
            </div>
        ),
        {
            ...size,
        }
    )
}
