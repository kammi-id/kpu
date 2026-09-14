// src/App.tsx

import { type FormEvent, useState } from "react";
import { ArrowUpRight, Check, Send } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import "./App.css";

function App() {
	const [email, setEmail] = useState("");
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isChecked, setIsChecked] = useState(false);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (email.trim()) setIsSubscribed(true);
	}

	return (
		<main className="field-notes">
			<header className="masthead">
				<a className="wordmark" href="#top" aria-label="Field notes home">
					KPU / FIELD NOTES
				</a>
				<Badge variant="outline">STATUS: GATHERING SIGNAL</Badge>
			</header>

			<section className="hero" id="top" aria-labelledby="page-title">
				<div className="hero-copy">
					<p className="issue-line">Dispatch 01 · somewhere ahead</p>
					<h1 id="page-title">A useful thing is taking shape.</h1>
					<p className="lede">
						We are still naming the destination. The tools, however, are already
						packed and working.
					</p>
					<div className="proof-line" aria-live="polite">
						<span className="proof-dot" />
						Shadcn / Base UI is {isChecked ? "verified in this browser" : "standing by"}
					</div>
					<Button
						variant={isChecked ? "secondary" : "default"}
						onClick={() => setIsChecked(true)}
					>
						{isChecked ? <Check data-icon="inline-start" /> : <ArrowUpRight data-icon="inline-start" />}
						{isChecked ? "Components confirmed" : "Run a component check"}
					</Button>
				</div>

				<Card className="dispatch-card">
					<CardHeader>
						<CardTitle>Leave a forwarding address</CardTitle>
						<CardDescription>
							No launch date to promise yet—just a place to send the first real note.
						</CardDescription>
						<Badge variant={isSubscribed ? "secondary" : "outline"}>
							{isSubscribed ? "RECEIVED" : "OPTIONAL"}
						</Badge>
					</CardHeader>
					<CardContent>
						<form className="dispatch-form" onSubmit={handleSubmit}>
							<label htmlFor="dispatch-email">Email address</label>
							<Input
								id="dispatch-email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="you@example.com"
								required
							/>
							<Button type="submit" className="w-full">
								<Send data-icon="inline-start" />
								{isSubscribed ? "Address filed" : "File my address"}
							</Button>
						</form>
					</CardContent>
					<CardFooter>
						<p aria-live="polite">
							{isSubscribed
								? "Filed locally for this demo. Connect your own endpoint when the plan is ready."
								: "This is a live component demo; nothing is sent yet."}
						</p>
					</CardFooter>
				</Card>
			</section>

			<section className="component-strip" aria-labelledby="proof-title">
				<div>
					<h2 id="proof-title">Not a mockup. A small kit, already live.</h2>
					<p>These are project-local shadcn source components, composed into this page.</p>
				</div>
				<ul className="component-list">
					<li><span>01</span> Button <Badge variant="secondary">INTERACTIVE</Badge></li>
					<li><span>02</span> Badge <Badge variant="secondary">STATEFUL</Badge></li>
					<li><span>03</span> Input <Badge variant="secondary">FOCUSED</Badge></li>
					<li><span>04</span> Card <Badge variant="secondary">COMPOSED</Badge></li>
				</ul>
			</section>

			<footer>
				<p>Keep this tab. The next dispatch will have a destination.</p>
				<p>© {new Date().getFullYear()} KPU</p>
			</footer>
		</main>
	);
}

export default App;
