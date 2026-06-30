export const generateUsername = (fullName: string) => {
  const names = fullName.trim().split(" ");

  const firstName = names[0];

  const lastName = names[names.length - 1];

  return (
    lastName.substring(0, 3).toLowerCase() +
    firstName.substring(0, 3).toLowerCase()
  );
};