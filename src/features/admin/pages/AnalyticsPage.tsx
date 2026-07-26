import { AlertCircle, BarChart3, MapPin, Star, Store, TrendingUp } from '../../../shared/icons';
import { Card, SectionTitle } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useAdminState } from '../context';
import { AdminDevNote, KpiCard } from '../components/shared';

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 54px', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: C.text }}>{label}</div>
      <div style={{ height: 10, borderRadius: 999, background: C.bgMuted, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', borderRadius: 999, background: color }} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'Outfit', sans-serif", textAlign: 'right' }}>{value}</div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { providers } = useAdminState();
  const regs = [
    { label: 'lut', value: 8 },
    { label: 'mar', value: 12 },
    { label: 'kwi', value: 15 },
    { label: 'maj', value: 18 },
    { label: 'cze', value: 23 },
    { label: 'lip', value: 27 },
  ];
  const byType = Array.from(new Set(providers.map((provider) => provider.typeLabel))).map((label) => ({ label, value: providers.filter((provider) => provider.typeLabel === label).length }));
  const byCity = Array.from(new Set(providers.map((provider) => provider.city))).map((label) => ({ label, value: providers.filter((provider) => provider.city === label).length }));
  const maxReg = Math.max(...regs.map((item) => item.value), 1);
  const maxType = Math.max(...byType.map((item) => item.value), 1);
  const maxCity = Math.max(...byCity.map((item) => item.value), 1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 18 }}>
        <KpiCard icon={<TrendingUp size={20} />} label="Konwersja trial→płatność" value="62%" accent={C.greenLight} iconColor={C.green} />
        <KpiCard icon={<AlertCircle size={20} />} label="Churn miesięczny" value="3,1%" accent="oklch(0.95 0.04 15)" iconColor={C.roseDark} />
        <KpiCard icon={<BarChart3 size={20} />} label="Rezerwacje (30 dni)" value="1 284" accent={C.tealLight} iconColor={C.tealDark} />
        <KpiCard icon={<Star size={20} />} label="Śr. ocena platformy" value="4,7" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={TrendingUp}>Nowe rejestracje (6 mies.)</SectionTitle>
          {regs.map((item) => <BarRow key={item.label} label={item.label} value={item.value} max={maxReg} color={C.primary} />)}
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Store}>Placówki wg typu</SectionTitle>
          {byType.map((item) => <BarRow key={item.label} label={item.label} value={item.value} max={maxType} color={C.tealDark} />)}
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={MapPin}>Placówki wg miasta</SectionTitle>
          {byCity.map((item) => <BarRow key={item.label} label={item.label} value={item.value} max={maxCity} color={C.amber} />)}
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={BarChart3}>Lejek aktywacji</SectionTitle>
          <BarRow label="Rejestracje" value={100} max={100} color={C.primary} />
          <BarRow label="Zatwierdzone" value={84} max={100} color={C.tealDark} />
          <BarRow label="Trial aktywny" value={71} max={100} color={C.teal} />
          <BarRow label="Płatność" value={44} max={100} color={C.green} />
        </Card>
      </div>
      <AdminDevNote>
        Dane demonstracyjne (część liczona z danych placówek). TODO [backend]: realne metryki z hurtowni danych, zakresy dat, eksport CSV, kohorty i retencja.
      </AdminDevNote>
    </div>
  );
}
