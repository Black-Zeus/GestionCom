import * as RemixIcons from "react-icons/ri";

const IconList = ({ icons }) => {
  return (
    <ul>
      {icons.map((iconName) => {
        const IconComponent = RemixIcons[iconName]; // Obtiene el icono dinámicamente

        return (
          <li key={iconName} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {IconComponent ? <IconComponent size={24} /> : <span>⚠️</span>}
            <span>{iconName}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default IconList;