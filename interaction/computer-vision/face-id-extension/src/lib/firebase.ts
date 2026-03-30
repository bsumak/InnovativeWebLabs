import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
	apiKey: "AIzaSyD4c-BSmbOExDhBUDTvvPt00oarhXHNsDU",
	authDomain: "face-id-extension.firebaseapp.com",
	databaseURL:
		"https://face-id-extension-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "face-id-extension",
	storageBucket: "face-id-extension.firebasestorage.app",
	messagingSenderId: "1018470509811",
	appId: "1:1018470509811:web:269912e446b194c4c21b86",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
