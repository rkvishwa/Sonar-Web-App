// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface ImportMetaEnv {
		readonly VITE_APPWRITE_ENDPOINT?: string;
		readonly VITE_APPWRITE_PROJECT_ID?: string;
		readonly VITE_APPWRITE_DB_NAME?: string;
		readonly VITE_APPWRITE_COLLECTION_SESSIONS?: string;
		readonly VITE_APPWRITE_COLLECTION_ACTIVITY_LOGS?: string;
		readonly VITE_APPWRITE_COLLECTION_REPORTS?: string;
		readonly VITE_APPWRITE_COLLECTION_SETTINGS?: string;
		readonly VITE_APPWRITE_COLLECTION_HACKATHONS?: string;
		readonly VITE_APPWRITE_FUNCTION_SETTINGS?: string;
		readonly VITE_DEV_KEY?: string;
		readonly VITE_APPWRITE_DEV_KEY?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
