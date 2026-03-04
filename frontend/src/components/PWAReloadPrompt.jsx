import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function PWAReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setNeedRefresh(false)
    }

    if (!needRefresh) {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 transform translate-y-0 opacity-100 flex flex-col gap-3 max-w-sm w-full">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Update available
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        A new version of EW Leasing is ready. Reload to update.
                    </p>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
                <button
                    onClick={() => close()}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                    Close
                </button>
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                    Reload App
                </button>
            </div>
        </div>
    )
}

export default PWAReloadPrompt
