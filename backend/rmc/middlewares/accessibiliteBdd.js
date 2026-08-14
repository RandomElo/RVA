export const accessibiliteBdd = (bdd) => {
    return (req, res, next) => {
        const { sequelize, Utilisateurs, Tokens, Articles, Courses, Statistiques, Specialistes, Images, Pages, AdherentsCourse } = bdd;

        req.Sequelize = sequelize;
        req.Utilisateurs = Utilisateurs;
        req.Tokens = Tokens;
        req.Articles = Articles;
        req.Courses = Courses;
        req.Statistiques = Statistiques;
        req.Specialistes = Specialistes;
        req.Images = Images;
        req.Pages = Pages;
        req.AdherentsCourse = AdherentsCourse;

        next();
    };
};
