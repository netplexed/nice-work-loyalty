# Admin Scanner Camera Switch

The current scanner uses `Html5QrcodeScanner` which provides a default UI that may effectively hide the camera switch option on some devices/screens. I will refactor this to use the `Html5Qrcode` class directly, giving us full control to implement a custom "Switch Camera" button.

## User Review Required

> [!NOTE]
> This changes the scanner UI from the library's default look to a custom implementation.

## Proposed Changes

### Components

#### [MODIFY] [voucher-scanner.tsx](file:///c:/Users/Howard/Documents/GitHub/nice-work-loyalty/components/admin/voucher-scanner.tsx)

-   Replace `Html5QrcodeScanner` with `Html5Qrcode`.
-   Add state for `facingMode` ('environment' | 'user').
-   Implement `start` and `stop` logic manually.
-   Add a **"Switch Camera"** button in the header (next to the close button).

#### [MODIFY] [page.tsx](file:///c:/Users/Howard/Documents/GitHub/nice-work-loyalty/app/(admin)/admin/redeem/page.tsx)

-   Update form layout to be responsive.
-   On Mobile: 
    1. Row with "Scan Camera" and "Redeem" buttons.
    2. Input field below them (full width).
-   On Desktop: Keep existing row layout.

## Verification Plan

### Manual Verification
1.  Open Admin > Redeem.
2.  Click "Scan Camera".
3.  Verify camera starts (defaults to back/environment).
4.  Click "Switch Camera" button.
5.  Verify camera switches to front/user (if available).
6.  Scan a QR code to ensure it still works.
