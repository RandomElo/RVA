interface Props {
    texte: string;
    lien: string;
    description: string
}

export default function PuceLicense({ texte, lien, description }: Props) {
    return <li>
        <a href={lien} className="underline text-blue-700" target="_blank" rel="noopener noreferrer"> {texte}</a>
        {" : "}{description}.
    </li>

}