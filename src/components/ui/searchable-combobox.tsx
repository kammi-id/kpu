import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "~/components/ui/combobox";

export type OpsiCombobox = { id: string; label: string };

/** Nilai bebas (free text) dipakai saat tidak ada opsi yang cocok dipilih, atau API sumber opsi gagal. */
export type NilaiComboboxSearchable = OpsiCombobox | string;

type SearchableComboboxProps = {
	id?: string;
	name?: string;
	options: OpsiCombobox[];
	value: NilaiComboboxSearchable;
	onValueChange: (value: NilaiComboboxSearchable) => void;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	emptyMessage?: string;
	"aria-label"?: string;
};

function teksDari(value: NilaiComboboxSearchable): string {
	return typeof value === "string" ? value : value.label;
}

/**
 * Combobox pencarian generik di atas `@base-ui/react/combobox` (tiket 21).
 * Menerima opsi `{id, label}`, mengembalikan opsi persis seperti itu saat
 * dipilih dari daftar, atau mengembalikan teks yang diketik apa adanya sebagai
 * nilai bebas — dipakai saat tidak ada opsi cocok maupun saat API sumber opsi
 * gagal (pengguna tetap bisa mengisi manual).
 */
export function SearchableCombobox({
	id,
	name,
	options,
	value,
	onValueChange,
	placeholder,
	disabled,
	required,
	emptyMessage = "Tidak ada opsi yang cocok.",
	...props
}: SearchableComboboxProps) {
	const terpilih = typeof value === "string" ? null : value;

	return (
		<Combobox
			items={options}
			value={terpilih}
			onValueChange={(opsi) => onValueChange(opsi ?? teksDari(value))}
			inputValue={teksDari(value)}
			onInputValueChange={(teks, detail) => {
				// Reason "item-press": Input diisi otomatis oleh label opsi terpilih;
				// onValueChange di atas sudah menangani nilai objeknya, jangan ditimpa teks.
				if (detail.reason === "item-press") return;
				onValueChange(teks);
			}}
			itemToStringLabel={(opsi: OpsiCombobox) => opsi.label}
			isItemEqualToValue={(a: OpsiCombobox, b: OpsiCombobox) => a.id === b.id}
			disabled={disabled}
		>
			<ComboboxInput
				id={id}
				name={name}
				placeholder={placeholder}
				disabled={disabled}
				required={required}
				{...props}
			/>
			<ComboboxContent>
				<ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
				<ComboboxList>
					{(opsi: OpsiCombobox) => (
						<ComboboxItem key={opsi.id} value={opsi}>
							{opsi.label}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
