import Page from '@/components/layout/frames/Page';
import DeleteAccount from '@/features/auth/components/dialog/DeleteAccount.tsx';
import { useAuth } from '@/features/auth/hooks/useAuth';
import ManageMfa from '@/features/auth/components/dialog/ManageMfa.tsx';
import Section from '@/components/layout/section/Section';
import { ICONS } from '@/config/iconConfig';
import Footer from '@/components/layout/app/Footer';
import { DashCardRow } from '@/components/layout/card/DashCardRow';
import {Scale, Settings, Shield, Menu} from "lucide-react";

export default function YouPage() {
    const { user, deleteUser, logout } = useAuth();

    return (
        <Page icon={ICONS.login} title="You" subtitle="Manage your account settings.">
            <div>
                <Section icon={Menu} title="Customisation">
                    <DashCardRow
                        to="/user/preferences"
                        icon={Settings}
                        label="Preferences"
                        description="Update training defaults and unit settings"
                    />
                    <DashCardRow
                        to="/user/bodyweight"
                        icon={Scale}
                        label="Bodyweight"
                        description="Log and track your bodyweight over time"
                    />
                </Section>
                <Section title="Security" icon={Shield}>
                    <ManageMfa />
                    <DashCardRow label={"Change Password"} description="Update your account password." icon={ICONS.login} to="/user/change-password" />
                </Section>
                <Section title="Actions" icon={ICONS.settings}>
                    <DeleteAccount user={user} deleteUser={deleteUser} />
                    <DashCardRow icon={ICONS.logout} onClick={() => logout()} label="Log out" description="Sign out of your account on this device." />
                </Section>
            </div>
            <Footer />
        </Page>
    );
}
