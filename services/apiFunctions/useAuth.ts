import { collection, query, where, getDocs, doc, setDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { User, Student, Tutor } from "../types";

export const useAuth = () => {
    const login = async (email: string, password: string): Promise<User | null> => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email), where("password", "==", password));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const userData = querySnapshot.docs[0].data() as User;
        return userData;
    };
}