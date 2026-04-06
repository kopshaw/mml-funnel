import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface WelcomeEmailProps {
  firstName: string;
  offerName: string;
  bookingUrl?: string;
}

export default function WelcomeEmail({
  firstName = "there",
  offerName = "our services",
  bookingUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Metric Mentor Labs - let&apos;s get started</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Welcome, {firstName}!</Heading>
            <Text style={paragraph}>
              Thanks for your interest in {offerName}. I&apos;m Steve from Metric
              Mentor Labs, and I help businesses streamline their operations so
              they can focus on growth.
            </Text>
            <Text style={paragraph}>
              I noticed you signed up because you&apos;re looking to improve how
              your business runs day-to-day. That&apos;s exactly what we do.
            </Text>
            <Text style={paragraph}>
              Here&apos;s what happens next:
            </Text>
            <Text style={listItem}>
              1. We&apos;ll send you a quick text to learn more about your
              situation
            </Text>
            <Text style={listItem}>
              2. If we&apos;re a good fit, we&apos;ll set up a quick strategy call
            </Text>
            <Text style={listItem}>
              3. You&apos;ll walk away with a clear action plan — whether we work
              together or not
            </Text>
            {bookingUrl && (
              <>
                <Text style={paragraph}>
                  Want to skip ahead and book a call now?
                </Text>
                <Button style={button} href={bookingUrl}>
                  Book Your Strategy Call
                </Button>
              </>
            )}
            <Hr style={hr} />
            <Text style={footer}>
              Metric Mentor Labs
              <br />
              Business Operations Consultancy
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0f172a",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px 0",
};

const box = {
  backgroundColor: "#1e293b",
  borderRadius: "12px",
  padding: "40px",
};

const heading = {
  color: "#f8fafc",
  fontSize: "28px",
  fontWeight: "bold" as const,
  marginBottom: "24px",
};

const paragraph = {
  color: "#cbd5e1",
  fontSize: "16px",
  lineHeight: "1.6",
  marginBottom: "16px",
};

const listItem = {
  color: "#cbd5e1",
  fontSize: "16px",
  lineHeight: "1.6",
  marginBottom: "8px",
  paddingLeft: "8px",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "14px 24px",
  marginTop: "16px",
  marginBottom: "16px",
};

const hr = {
  borderColor: "#334155",
  margin: "24px 0",
};

const footer = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "1.5",
};
