import { JSX } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import BookContainer from "./pages/BookContainer.tsx";
import Index from "./pages/index.tsx";
import "./App.css";

function App(): JSX.Element {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/books/" element={<Index />} />
				<Route path="/books/:bookId" element={<BookContainer />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
