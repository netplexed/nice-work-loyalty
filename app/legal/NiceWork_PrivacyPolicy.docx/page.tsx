import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Privacy Policy | Nice Work',
    description: 'Nice Work Loyalty Program Privacy Policy'
}

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/"
                    className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to Home
                </Link>

                <div className="rounded-lg border bg-white p-6 shadow-sm md:p-8">
                    <h1 className="text-2xl font-bold">Privacy Policy</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Nice Work Loyalty Program</p>
                    <p className="text-sm text-muted-foreground">Operated by Crown Empire Pte. Limited</p>
                    <p className="mt-2 text-sm">
                        <strong>Effective Date:</strong> February 17, 2026 | <strong>Last Updated:</strong> February 17, 2026
                    </p>

                    <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm">
                        Need an offline copy?{' '}
                        <Link href="/legal/NiceWork_PrivacyPolicy_download.docx" className="underline">
                            Download the .docx version
                        </Link>
                    </div>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">1. Introduction</h2>
                        <p>
                            Welcome to Nice Work, the loyalty program operated by Crown Empire Pte. Limited (collectively referred to as
                            &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). Nice Work is a rewards and engagement platform for customers of our restaurant brands,
                            including Tanuki Raw and Standing Sushi Bar.
                        </p>
                        <p>
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you use the
                            Nice Work mobile application (&quot;App&quot;) and related services. It also describes your rights under Singapore&apos;s
                            Personal Data Protection Act 2012 (&quot;PDPA&quot;).
                        </p>
                        <p>
                            By downloading, registering for, or using the Nice Work App, you acknowledge that you have read and understood
                            this Privacy Policy and consent to the collection and use of your personal data as described herein.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">2. Personal Data We Collect</h2>
                        <p>We collect the following categories of personal data:</p>
                        <h3 className="font-semibold">2.1 Information You Provide Directly</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Full name</li>
                            <li>Email address</li>
                            <li>Mobile phone number</li>
                            <li>Date of birth (for birthday reward purposes)</li>
                            <li>Password (stored in encrypted form)</li>
                            <li>Referral code (if you were referred by another user)</li>
                        </ul>
                        <h3 className="font-semibold">2.2 Information Generated Through App Use</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Transaction and purchase records at our restaurant locations</li>
                            <li>Visit history and check-in records (based on recorded spend)</li>
                            <li>Points balance, Nice currency balance, and transaction ledger</li>
                            <li>Loyalty tier status (Bronze, Silver, Gold, Platinum)</li>
                            <li>Spin wheel participation records</li>
                            <li>Lottery draw entry records and prize history</li>
                            <li>Referral activity (codes issued and used)</li>
                            <li>Reward redemption history</li>
                        </ul>
                        <h3 className="font-semibold">2.3 Device and Technical Information</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Device type, operating system, and version (iOS or Android)</li>
                            <li>Push notification token (if you enable push notifications)</li>
                            <li>App usage data and session information</li>
                            <li>IP address and approximate location (country/region level)</li>
                        </ul>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">3. How We Use Your Personal Data</h2>
                        <p>We use your personal data for the following purposes:</p>
                        <h3 className="font-semibold">3.1 Program Operation</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Creating and managing your Nice Work account</li>
                            <li>Calculating and crediting Points earned from qualifying purchases</li>
                            <li>Generating and managing your Nice currency balance based on time-based accrual and tier multipliers</li>
                            <li>Processing reward redemptions and issuing vouchers</li>
                            <li>Administering referral rewards for you and users you refer</li>
                            <li>Determining and maintaining your loyalty tier status</li>
                        </ul>
                        <h3 className="font-semibold">3.2 Lottery and Promotions</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Entering you into weekly lottery draws when push notifications are enabled and qualifying conditions are met</li>
                            <li>Awarding and distributing lottery prizes (points, Nice, vouchers, or physical prizes)</li>
                            <li>
                                Maintaining required records of draw results and prize distribution as required by the Gambling Control Act 2022
                            </li>
                            <li>
                                Publishing winner notifications (using partial identification only) in accordance with applicable regulations
                            </li>
                        </ul>
                        <h3 className="font-semibold">3.3 Communications</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Sending transactional notifications (points earned, rewards redeemed, prize won)</li>
                            <li>
                                Sending push notifications related to lottery draws, promotions, and program updates (only if you have enabled
                                push notifications)
                            </li>
                            <li>Sending birthday rewards and milestone achievement notifications</li>
                            <li>Responding to your enquiries and customer support requests</li>
                        </ul>
                        <h3 className="font-semibold">3.4 Legal and Regulatory Compliance</h3>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>
                                Maintaining records as required under the Gambling Control (Trade and Other Promotional Games and Lotteries)
                                Class Licence Order 2022
                            </li>
                            <li>Complying with our obligations under the PDPA</li>
                            <li>Preventing fraud and ensuring program integrity</li>
                        </ul>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">4. Legal Basis for Processing</h2>
                        <p>We process your personal data based on the following grounds:</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>
                                <strong>Consent:</strong> Where you have given explicit consent, such as enabling push notifications or opting
                                into marketing communications.
                            </li>
                            <li>
                                <strong>Contractual Necessity:</strong> Processing required to fulfill the Nice Work loyalty program membership
                                agreement with you.
                            </li>
                            <li>
                                <strong>Legal Obligation:</strong> Processing required to comply with Singapore law, including the PDPA and
                                Gambling Control Act 2022.
                            </li>
                            <li>
                                <strong>Legitimate Interests:</strong> Processing necessary for fraud prevention, program security, and improving
                                our services.
                            </li>
                        </ul>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">5. Disclosure of Your Personal Data</h2>
                        <p>
                            We do not sell your personal data to third parties. We may share your data in the following limited circumstances:
                        </p>
                        <h3 className="font-semibold">5.1 Service Providers</h3>
                        <p>We engage trusted third-party service providers who process data on our behalf, including:</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Cloud infrastructure and database providers (for secure data storage)</li>
                            <li>Push notification delivery services</li>
                            <li>Email service providers</li>
                            <li>Analytics providers (aggregated, non-identifiable data only)</li>
                        </ul>
                        <p>
                            All service providers are contractually required to process your data only on our instructions and in compliance
                            with the PDPA.
                        </p>
                        <h3 className="font-semibold">5.2 Lottery Compliance</h3>
                        <p>
                            For non-instant lottery draws with total prize values exceeding SGD 10,000, we are required by law to conduct the
                            draw in the presence of an independent scrutineer and publish draw results on our website or in a major Singapore
                            newspaper.
                        </p>
                        <p>
                            When publishing winner information, we will only disclose the last three numerical digits and letter of your
                            NRIC/FIN, and will not disclose your full name or other identifying information without your consent.
                        </p>
                        <h3 className="font-semibold">5.3 Legal Requirements</h3>
                        <p>
                            We may disclose your personal data if required to do so by law, court order, or governmental authority, or where
                            we believe disclosure is necessary to protect our legal rights or prevent illegal activity.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">6. Data Retention</h2>
                        <p>We retain your personal data for the following periods:</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Account data: For the duration of your membership plus 3 years after account closure</li>
                            <li>Transaction and purchase records: 7 years (for tax and audit purposes)</li>
                            <li>Lottery and promotional records: 5 years minimum (as required by the Gambling Control Act 2022)</li>
                            <li>Push notification tokens: Until you disable push notifications or delete your account</li>
                        </ul>
                        <p>
                            When personal data is no longer needed for the purpose for which it was collected, we will securely delete or
                            anonymise it.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">7. Push Notifications</h2>
                        <p>Push notifications are entirely optional. Enabling push notifications allows you to:</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Receive automatic entry into our weekly lottery draws</li>
                            <li>Be notified of lottery results and prize wins</li>
                            <li>Receive program updates, promotions, and personalised offers</li>
                        </ul>
                        <p>
                            You may withdraw consent for push notifications at any time through your device settings (iOS: Settings &gt;
                            Notifications &gt; Nice Work; Android: Settings &gt; Apps &gt; Nice Work &gt; Notifications) or within the App
                            settings. Disabling push notifications will remove your automatic lottery entry entitlement but will not affect your
                            earned Points, Nice balance, or loyalty tier.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">8. Your Rights Under the PDPA</h2>
                        <p>As a data subject under Singapore&apos;s PDPA, you have the following rights:</p>
                        <h3 className="font-semibold">8.1 Right of Access</h3>
                        <p>
                            You may request a copy of the personal data we hold about you, including your transaction history, points balance,
                            and account information. Requests can be made through the App or by emailing us at the contact address below.
                        </p>
                        <h3 className="font-semibold">8.2 Right of Correction</h3>
                        <p>
                            You may request that we correct any inaccurate or incomplete personal data we hold about you. You can update most
                            account information directly within the App.
                        </p>
                        <h3 className="font-semibold">8.3 Right to Withdraw Consent</h3>
                        <p>
                            Where our processing is based on your consent, you may withdraw that consent at any time. Withdrawal of consent
                            does not affect the lawfulness of processing prior to the withdrawal.
                        </p>
                        <h3 className="font-semibold">8.4 Right to Data Portability</h3>
                        <p>You may request a copy of your personal data in a structured, commonly used, machine-readable format.</p>
                        <h3 className="font-semibold">8.5 Account Deletion</h3>
                        <p>
                            You may request deletion of your Nice Work account at any time. Upon deletion, your Points and Nice balances will be
                            forfeited and cannot be recovered. We will retain certain records as required by law (see Section 6).
                        </p>
                        <p>
                            To exercise any of these rights, please contact us at:{' '}
                            <a className="underline" href="mailto:privacy@niceworkapp.com">privacy@niceworkapp.com</a>
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">9. Data Security</h2>
                        <p>
                            We implement appropriate technical and organisational measures to protect your personal data against unauthorised
                            access, alteration, disclosure, or destruction. These measures include:
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Encryption of data in transit (TLS) and at rest</li>
                            <li>Secure server infrastructure with access controls</li>
                            <li>Regular security assessments</li>
                            <li>Staff training on data protection obligations</li>
                        </ul>
                        <p>
                            However, no method of electronic transmission or storage is 100% secure. While we strive to protect your personal
                            data, we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">10. Children&apos;s Privacy</h2>
                        <p>
                            The Nice Work App is intended for users aged 18 and above. We do not knowingly collect personal data from
                            individuals under the age of 18. If you are under 18, please do not register for or use the App.
                        </p>
                        <p>
                            If we become aware that we have collected personal data from a person under 18 without appropriate consent, we will
                            take steps to delete such data promptly.
                        </p>
                        <p>
                            Note: Lottery prizes will not include goods or services that individuals under the minimum legal age are prohibited
                            from purchasing (e.g., alcohol), unless age verification has been completed.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">11. Third-Party Links and Services</h2>
                        <p>
                            The App may contain links to third-party websites or integrate with third-party services. This Privacy Policy does
                            not apply to those third-party services, and we are not responsible for their privacy practices. We encourage you to
                            review the privacy policies of any third-party services you use.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">12. Changes to This Privacy Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
                            requirements, or other factors. When we make material changes, we will:
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Update the &quot;Last Updated&quot; date at the top of this policy</li>
                            <li>Notify you via push notification or email where required</li>
                            <li>For significant changes, request your renewed consent where applicable</li>
                        </ul>
                        <p>
                            Your continued use of the App after any changes constitutes your acceptance of the updated Privacy Policy.
                        </p>
                    </section>

                    <section className="mt-6 space-y-3 text-sm leading-6">
                        <h2 className="text-base font-semibold">13. Contact Us</h2>
                        <p>
                            If you have any questions, concerns, or requests regarding this Privacy Policy or our data protection practices,
                            please contact us:
                        </p>
                        <p>
                            Crown Empire Pte. Limited
                            <br />
                            Data Protection Contact:{' '}
                            <a className="underline" href="mailto:hello@nicework.sg">hello@nicework.sg</a>
                            <br />
                            For guests of Tanuki Raw and Standing Sushi Bar
                        </p>
                        <p>
                            We aim to respond to all enquiries within 10 business days.
                        </p>
                        <p>
                            If you are not satisfied with our response, you may contact the Personal Data Protection Commission (PDPC) of
                            Singapore at{' '}
                            <a className="underline" href="https://www.pdpc.gov.sg" target="_blank" rel="noopener noreferrer">
                                www.pdpc.gov.sg
                            </a>
                            .
                        </p>
                    </section>

                    <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
                        Nice Work Loyalty Program | Crown Empire Pte. Limited
                        <br />
                        Effective: February 17, 2026
                    </p>
                </div>
            </div>
        </main>
    )
}
