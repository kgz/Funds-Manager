import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { motion } from "motion/react";
import { NavLink } from "react-router";

const RegisterPage = () => {
	return (
	  <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
		<motion.div
		  initial={{ opacity: 0, y: 20 }}
		  animate={{ opacity: 1, y: 0 }}
		  transition={{ duration: 0.6 }}
		>
		  <Card className="w-full max-w-md rounded-2xl shadow-2xl bg-white/90 backdrop-blur-md">
			<CardContent className="p-8">
			  <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Create an Account</h2>
			  <form className="space-y-5">
				<div>
				  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
					Full Name
				  </label>
				  <Input
					id="name"
					type="text"
					placeholder="John Doe"
					className="mt-1 w-full"
				  />
				</div>
				<div>
				  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
					Email
				  </label>
				  <Input
					id="email"
					type="email"
					placeholder="you@example.com"
					className="mt-1 w-full"
					autoComplete="email"
				  />
				</div>
				<div>
				  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
					Password
				  </label>
				  <Input
					id="password"
					type="password"
					placeholder="••••••••"
					className="mt-1 w-full"
					autoComplete="new-password"
				  />
				</div>
				<Button className="w-full text-lg py-2 rounded-xl">
				  Register
				</Button>
				<p className="text-center text-sm text-gray-600">
				  Already have an account? <NavLink to="/login" className="text-purple-600 hover:underline">Log in</NavLink>
				</p>
				

			  </form>
			</CardContent>
		  </Card>
		</motion.div>
	  </div>
	);
  };
  
  export default RegisterPage;
  