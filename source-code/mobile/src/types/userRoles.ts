import { Href } from "expo-router"

export interface UserRole {
    id: string;
    role: string;
    description: string;
    route: Href;
}
