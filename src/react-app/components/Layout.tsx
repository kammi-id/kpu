import { Header } from "./Header";
import { Footer } from "./Footer";
import { OutletBerjeda } from "./OutletBerjeda";

export function Layout() {
	return (
		<div className="flex min-h-svh flex-col">
			<Header />
			<main className="flex-1">
				<OutletBerjeda />
			</main>
			<Footer />
		</div>
	);
}
