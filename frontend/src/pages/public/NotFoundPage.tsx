import Page from "@/components/layout/frames/Page";
import { ICONS } from "@/config/iconConfig";

export default function NotFoundPage() {
    return (
       <Page title="Not Found" subtitle="The page you are looking for does not exist." icon={ICONS.notFound}>
       </Page>
    );
}