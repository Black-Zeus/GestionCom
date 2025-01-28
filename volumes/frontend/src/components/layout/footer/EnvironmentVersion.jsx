import useConfigStore from "../../../store/configStore";

const EnvironmentVersion = () => {
    const { environment, appVersion } = useConfigStore();

    return (
        <div className="col-span-12 sm:col-span-4 flex items-center justify-center sm:justify-end">
            <p className="text-xs">
                <span className="font-semibold">Ambiente:</span> {environment} |
                <span className="font-semibold"> Versión:</span> {appVersion}
            </p>
        </div>
    );
};

export default EnvironmentVersion;
