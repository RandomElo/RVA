export default function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-[#040F33]">{titre}</h2>
            {children}
        </section>
    );
}
