import { useAuth } from '@/components/auth/AuthProvider';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { buttonPrimaryClass, eyebrowClass, inputDarkClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormEvent, useEffect, useId, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

export function LoginPage() {
	const navigate = useNavigate();
	const { loading: authLoading, authenticated, canRegister, login, register } = useAuth();

	const emailId = useId();
	const passwordId = useId();
	const bannerId = useId();

	const [createAccount, setCreateAccount] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [emailError, setEmailError] = useState(false);
	const [passwordError, setPasswordError] = useState(false);
	const [banner, setBanner] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (canRegister) {
			setCreateAccount(true);
		}
	}, [canRegister]);

	if (authLoading) {
		return <PageLoadingState label="Checking session…" />;
	}

	if (authenticated) {
		return <Navigate to="/" replace />;
	}

	function clearFieldErrors() {
		setEmailError(false);
		setPasswordError(false);
	}

	function hideBanner() {
		setBanner(null);
	}

	function validate(): boolean {
		clearFieldErrors();
		const emailVal = email.trim();
		const passVal = password;
		let ok = true;

		if (emailVal.length === 0) {
			setEmailError(true);
			ok = false;
		}
		if (passVal.length === 0) {
			setPasswordError(true);
			ok = false;
		} else if (passVal.length < 8) {
			setPasswordError(true);
			ok = false;
		}
		return ok;
	}

	async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
		ev.preventDefault();
		hideBanner();

		if (!validate()) {
			setBanner('Check the highlighted fields and try again.');
			return;
		}

		setLoading(true);
		try {
			if (createAccount) {
				await register(email.trim(), password);
			} else {
				await login(email.trim(), password);
			}
			navigate('/', { replace: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not sign in.';
			setBanner(message);
		} finally {
			setLoading(false);
		}
	}

	function handleForgotPassword(ev: React.MouseEvent<HTMLAnchorElement>) {
		ev.preventDefault();
		hideBanner();
		setBanner('Password reset is not available.');
	}

	const heading = createAccount ? 'Create account' : 'Sign in';
	const lede = createAccount
		? 'Set up the first FUNDS account for this instance.'
		: 'Use your local FUNDS credentials.';
	const submitLabel = createAccount ? 'Create account' : 'Sign in';
	const loadingLabel = createAccount ? 'Creating account…' : 'Signing in…';

	return (
		<div className="min-h-screen bg-paper font-sans text-paper-fg antialiased">
			<div className="grid min-h-screen grid-cols-1 max-[860px]:grid-cols-1 min-[861px]:grid-cols-[1.05fr_0.95fr]">
				<aside
					className="relative flex flex-col justify-between overflow-hidden bg-paper-fg px-6 py-7 text-paper-surface min-[861px]:px-12 min-[861px]:py-9"
					aria-label="Brand"
				>
					<div
						className="pointer-events-none absolute inset-auto -bottom-[30%] -right-[20%] left-[35%] h-[70%] rounded-full bg-paper-surface/[0.06]"
						aria-hidden
					/>
					<div className="relative z-10 flex items-center gap-3">
						<span
							className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-surface text-[15px] font-semibold text-paper-fg"
							aria-hidden
						>
							F
						</span>
						<span className="text-base tracking-[0.1em] text-paper-surface">Funds</span>
					</div>

					<div className="relative z-10 mx-0 my-7 max-w-[22ch] min-[861px]:my-12 min-[861px]:max-w-none">
						<h1 className="m-0 mb-4 font-sans text-[clamp(2.25rem,5.2vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
							FUNDS
						</h1>
						<p className="m-0 max-w-[34ch] text-base leading-[1.55] text-paper-surface/72">
							Calm personal finance for a self-hosted Australian household — spending,
							statements, and serviceability in one place.
						</p>
					</div>

					<p className="relative z-10 m-0 text-xs tracking-[0.02em] text-paper-surface/48 max-[860px]:hidden">
						Self-hosted · session cookie
					</p>
				</aside>

				<main className="flex flex-col justify-center bg-paper px-6 py-7 min-[861px]:px-12 min-[861px]:py-10 max-[860px]:justify-start max-[860px]:pb-12">
					<div className="mx-auto w-full max-w-[380px] max-[860px]:max-w-none">
						<p className={cn(eyebrowClass, 'mb-2')}>Account access</p>
						<h2 className="m-0 mb-1.5 font-sans text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-paper-fg">
							{heading}
						</h2>
						<p className="m-0 mb-7 max-w-[42ch] text-sm text-paper-muted">{lede}</p>

						{banner !== null ? (
							<div
								id={bannerId}
								role="status"
								aria-live="polite"
								className="mb-4 flex items-start gap-2.5 rounded-paper border border-red-600/35 bg-red-50 p-3 text-[13px] leading-[1.45] text-red-800"
							>
								<AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
								<span>{banner}</span>
							</div>
						) : null}

						<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-medium tracking-[0.02em] text-paper-fg" htmlFor={emailId}>
									Email
								</label>
								<input
									id={emailId}
									className={cn(
										inputDarkClass,
										'h-10 w-full px-3 text-sm',
										emailError && 'border-red-600/45'
									)}
									type="email"
									name="email"
									autoComplete="username"
									placeholder="you@example.com"
									inputMode="email"
									value={email}
									onChange={(ev) => {
										setEmail(ev.target.value);
										setEmailError(false);
									}}
									aria-invalid={emailError}
									aria-describedby={emailError ? `${emailId}-error` : undefined}
								/>
								{emailError ? (
									<p id={`${emailId}-error`} className="m-0 text-xs text-red-600">
										Enter your email.
									</p>
								) : null}
							</div>

							<div className="flex flex-col gap-1.5">
								<label
									className="text-xs font-medium tracking-[0.02em] text-paper-fg"
									htmlFor={passwordId}
								>
									Password
								</label>
								<div
									className={cn(
										'flex h-10 items-stretch overflow-hidden rounded-paper border border-paper-border bg-paper-surface transition-[border-color,box-shadow] focus-within:border-secondary-default/50 focus-within:ring-[3px] focus-within:ring-secondary-default/10',
										passwordError && 'border-red-600/45'
									)}
								>
									<input
										id={passwordId}
										className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-paper-fg placeholder:text-paper-muted focus:outline-none focus:ring-0"
										type={showPassword ? 'text' : 'password'}
										name="password"
										autoComplete={createAccount ? 'new-password' : 'current-password'}
										placeholder="••••••••"
										value={password}
										onChange={(ev) => {
											setPassword(ev.target.value);
											setPasswordError(false);
										}}
										aria-invalid={passwordError}
										aria-describedby={passwordError ? `${passwordId}-error` : undefined}
									/>
									<button
										type="button"
										className="grid w-11 shrink-0 cursor-pointer place-items-center border-l border-paper-border bg-transparent text-paper-muted transition-colors hover:bg-paper-fg/[0.03] hover:text-paper-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary-default"
										onClick={() => setShowPassword((prev) => !prev)}
										aria-label={showPassword ? 'Hide password' : 'Show password'}
										aria-pressed={showPassword}
									>
										{showPassword ? (
											<EyeOff size={18} aria-hidden />
										) : (
											<Eye size={18} aria-hidden />
										)}
									</button>
								</div>
								{passwordError ? (
									<p id={`${passwordId}-error`} className="m-0 text-xs text-red-600">
										{password.length === 0
											? 'Enter your password.'
											: 'Password must be at least 8 characters.'}
									</p>
								) : null}
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3">
								<label className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] text-paper-muted">
									<input
										type="checkbox"
										className="h-[15px] w-[15px] cursor-pointer accent-paper-fg"
										checked={remember}
										onChange={(ev) => setRemember(ev.target.checked)}
									/>
									Remember me
								</label>
								{!createAccount ? (
									<a
										href="#"
										className="text-[13px] font-medium tracking-[0.02em] text-paper-muted underline decoration-paper-muted/40 underline-offset-[3px] transition-colors hover:text-paper-fg focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-default"
										onClick={handleForgotPassword}
									>
										Forgot password?
									</a>
								) : null}
							</div>

							<button
								type="submit"
								className={cn(buttonPrimaryClass, 'mt-1 h-[42px] w-full gap-2 text-sm')}
								disabled={loading}
							>
								{loading ? (
									<Loader2 size={14} className="animate-spin" aria-hidden />
								) : null}
								<span>{loading ? loadingLabel : submitLabel}</span>
							</button>
						</form>

						{canRegister ? (
							<p className="mt-5 text-[13px] text-paper-muted">
								{createAccount ? 'Already have an account?' : 'First time here?'}{' '}
								<button
									type="button"
									className="cursor-pointer font-medium text-paper-fg underline decoration-paper-muted/40 underline-offset-[3px] hover:text-paper-fg"
									onClick={() => {
										hideBanner();
										clearFieldErrors();
										setCreateAccount((prev) => !prev);
									}}
								>
									{createAccount ? 'Sign in' : 'Create account'}
								</button>
							</p>
						) : null}
					</div>
				</main>
			</div>
		</div>
	);
}
