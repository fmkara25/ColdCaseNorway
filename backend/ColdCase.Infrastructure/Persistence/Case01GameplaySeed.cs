using System.Text.Json;
using ColdCase.Application.Investigations;
using ColdCase.Domain.Cases;
using ColdCase.Domain.Investigations;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class Case01GameplaySeed
{
    public static CaseAction[] CreateActions()
    {
        var order = 0;
        CaseAction A(string id, string kind, string? person, string label, string response, string[] requires,
            string[] grants, RequiredLink[]? links = null, string[]? route = null, int? minutes = null) => new()
        {
            CaseId = "1999-1218", Id = id, Kind = kind, PersonId = person, Label = label, Response = response,
            DisplayOrder = ++order, RuleJson = JsonSerializer.Serialize(new ActionRule(requires, grants, links ?? [], route, minutes), CaseRules.Json)
        };
        return [
            A("find-note", "research", null, "Se gjennom Ingrids etterlatte notater",
                "Et kort notat til Maria ligger blant Ingrids papirer. Det omtaler en bag og et avtalt tidspunkt. Notatet er nå lagt til bevisregisteret.",
                ["review:hotel-log", "review:maria-statement"], ["evidence:ingrid-note"]),
            A("phone-lookup", "check", null, "Kontroller motparten i samtaleloggen",
                "Sammenholdt med kontaktopplysningene i saksarkivet viser loggen en samtale mellom Ingrid og Jonas Mikkelsen kl. 21.47. Loggen sier ikke hva de snakket om.",
                ["review:phone-log", "review:jonas-statement"], ["evidence:phone-match"]),
            A("maria-plan", "interview", "maria", "Spør om notatet og den avtalte bagen",
                "Jeg visste at hun ville til Trondheim. Hun hadde pakket en bag som sto hos meg. Jeg sa ikke hele sannheten fordi jeg trodde jeg beskyttet henne. Hun skulle hente den, men kom aldri. Bagen ble stående igjen. Det var galt av meg å holde det tilbake.",
                ["review:ingrid-note", "review:maria-statement"], ["evidence:travel-bag"], [new("person:maria", "evidence:ingrid-note")]),
            A("jonas-call", "interview", "jonas", "Be Jonas forklare samtalen kl. 21.47",
                "Det var meg hun snakket med. Vi hadde hatt et forhold i omtrent tre måneder, men hun hadde avsluttet det. Jeg var gift og redd for at det skulle bli kjent. Den kvelden gjorde hun det klart at det var over. Jeg løy om kontakten. Jeg kan ikke fortelle dere hva som skjedde etter at hun dro.",
                ["review:phone-match", "review:jonas-statement"], ["evidence:ingrid-letter"], [new("evidence:phone-match", "evidence:jonas-statement")]),
            A("witness-followup", "research", null, "Undersøk observasjonen ved butikken nærmere",
                "Et supplerende notat fra samme vitne beskriver et kjøretøy ved butikken. Notatet gir et nytt holdepunkt, men identifiserer ikke føreren. Tidsopplysninger knyttet til Erik er også tilgjengelige for sammenligning.",
                ["review:travel-bag", "review:bus-ticket", "review:market-witness"],
                ["evidence:vehicle-witness", "evidence:erik-phone", "timeline:vehicle-pickup", "timeline:erik-location", "location:payphone", "road:market-payphone"],
                [new("evidence:travel-bag", "evidence:bus-ticket")]),
            A("erik-route", "check", null, "Vurder Eriks tids- og stedsopplysninger",
                "Fra butikken til telefonstedet er kjøretiden anslått til 22–30 minutter i vinterføre. Mellom den omtrentlige påstigningen og opplysningen kl. 22.24 er det bare åtte minutter. Det svekker denne delen av teorien om Erik, men er ikke en generell frifinnelse.",
                ["review:vehicle-witness", "review:erik-phone"], [], route: ["market", "payphone"], minutes: 8),
            A("company-records", "research", null, "Sammenhold kjøretøybeskrivelsen med selskapsarkivet",
                "Blant selskapets kjøretøyopplysninger finnes bil 14 og en eldre forklaring fra Lars Viken. Beskrivelsen av bilen er ikke nok til å identifisere den alene. Kjøreboken og arbeidsordren kan undersøkes sammen.",
                ["action:erik-route"], ["person:lars", "evidence:vehicle-log", "evidence:work-order", "evidence:lars-statement", "location:depot", "location:work-site", "road:depot-work", "road:work-market"]),
            A("mileage", "check", null, "Kontroller kjøreboken mot arbeidsordren",
                "Kilometerstanden økte fra 81 442 til 81 486: 44 km. Arbeidsordren beskriver omtrent 12 km. Omtrent 32 km mangler dermed en forklaring i de registrerte oppdragene. Flere kjøretøydokumenter er nå samlet i saken.",
                ["review:vehicle-log", "review:work-order"], ["evidence:card-transaction", "evidence:bumper-report", "evidence:clean-vehicle"], [new("evidence:vehicle-log", "evidence:work-order")]),
            A("terminal", "check", null, "Slå opp terminal 0184 og varelinjene",
                "Terminal 0184 tilhørte Skardal Nord bensinstasjon. Varelinjene gjelder drivstoff, spylervæske og tørkepapir. Kjøpet er registrert kl. 22.52. Hver vare har normale bruksområder; kjøpet må vurderes sammen med de øvrige opplysningene.",
                ["review:card-transaction"], ["evidence:station-receipt", "location:station", "road:station-depot", "timeline:station-payment"]),
            A("lars-early", "interview", "lars", "Spør direkte om Ingrid var i bilen",
                "Nei. Det har jeg jo forklart. Jeg hadde ikke sett henne på flere dager. At jeg kjente henne, betyr ikke at hun var med meg den kvelden.",
                ["review:lars-statement"], []),
            A("lars-mileage", "interview", "lars", "Be Lars forklare de ekstra kilometerne",
                "Det kan ha vært en ekstra utrykning. Jeg husker ikke alle småoppdragene nå. Vi fikk også beskjeder utenom de vanlige arbeidsordrene. Dere må se etter en hastejobb.",
                ["action:mileage", "review:lars-statement"], ["evidence:emergency-claim"], [new("person:lars", "evidence:vehicle-log")]),
            A("check-emergency", "check", null, "Kontroller den påståtte ekstra utrykningen",
                "Vaktloggen og arbeidsordrene inneholder ikke noen ekstra utrykning som forklarer turen. Et manglende notat beviser ikke alene at noe aldri hendte, men Lars har foreløpig ikke gitt et kontrollerbart oppdrag eller et sted.",
                ["action:lars-mileage", "review:work-order", "review:emergency-claim"], ["evidence:no-extra-job"]),
            A("lars-receipt", "interview", "lars", "Legg frem kjøpet kl. 22.52 og den manglende utrykningen",
                "Jeg fylte og ordnet bilen. Det var vinter, og den ble skitten. Spylervæske og papir kjøper folk hele tiden. Jeg klarer ikke å plassere alle stoppene så mange år etterpå.",
                ["action:check-emergency", "review:station-receipt"], [], [new("person:lars", "evidence:station-receipt")]),
            A("lars-damage", "interview", "lars", "Spør om skaden og den uvanlig rene bilen",
                "Jeg sa at jeg kom borti noe da jeg parkerte. Det var ikke noe overfall. Hun satte seg inn selv ... Jeg mener, dere får det til å høres ut som om jeg tvang noen.\n\nLars har nå omtalt en frivillig påstigning. Detaljen var ikke del av spørsmålene som ble stilt til ham her.",
                ["action:lars-receipt", "review:bumper-report", "review:clean-vehicle"], ["evidence:lars-slip"], [new("evidence:bumper-report", "evidence:clean-vehicle")]),
            A("lars-events", "interview", "lars", "Be Lars forklare hvordan han kjenner detaljen om påstigningen",
                "Jeg stanset ved butikken. Vi kjente hverandre, og hun ble med. Jeg hadde drukket og skulle ikke ha kjørt. På Gamle Møllevei mistet jeg kontrollen på isen og traff en betongkulvert. Hun slo hodet og svarte dårlig. Jeg skulle ha ringt etter hjelp.\n\nJeg kjørte først i retning sykehuset. Så ble jeg redd for politiet, førerkortet og jobben. Hun ble verre, og jeg trodde hun var død. Jeg snudde og kjørte til det gamle serviceområdet. Jeg la henne fra meg der. Etterpå prøvde jeg å skjule det. Jeg vet ikke hvor hun ble av senere.\n\nDette er Lars' forklaring. Den må fortsatt sammenholdes med avstander, tidsopplysninger og de andre kildene.",
                ["action:lars-damage", "review:lars-slip"], ["evidence:lars-account", "location:mill-road", "location:hospital-turn", "location:service-area", "road:market-mill", "road:mill-hospital-turn", "road:mill-service", "road:service-station", "stage:reconstruction"])
        ];
    }

    public static Evidence[] CreateEvidence()
    {
        var order = 20;
        Evidence E(string id, string title, string kind, string source, string body) => new()
        { CaseId = "1999-1218", Id = id, Title = title, Kind = kind, Source = source, Body = body, DisplayOrder = ++order };
        return [
            E("ingrid-note", "Notatet til Maria", "Personlig notat", "Ingrids papirer", "Maria – jeg henter bagen rundt kvart over ti. Takk for at du har den hos deg. I.\n\nNotatet viser en avtale, ikke at Ingrid faktisk kom frem."),
            E("phone-match", "Identifisert samtalepart", "Kontrollnotat", "Samtalelogg og kontaktopplysninger", "Samtalen kl. 21.47 den 18. desember var mellom Ingrid Solberg og Jonas Mikkelsen. Varighet: omtrent fire minutter. Jonas' opprinnelige forklaring oppgir ingen kontakt etter omtrent kl. 18.00."),
            E("travel-bag", "Bagen hos Maria", "Gjenstandsoversikt", "Marias oppfølgingsforklaring", "Ingrids ferdigpakkede bag ble stående hos Maria. Den inneholdt klær, en tannbørste, omtrent 3 800 kroner og en adresse i Trondheim. Ingrid hentet den ikke den kvelden.\n\nOpplysningene støtter en konkret reiseplan, men etterlater et spørsmål: Hvorfor ble de nødvendige eiendelene igjen?"),
            E("ingrid-letter", "Ingrids beskjed til Jonas", "Personlig beskjed", "Fremlagt etter oppfølgingssamtalen", "Det vi hadde, er over. Jeg vil videre og vil ikke fortsette å skjule dette. Jeg håper du respekterer det. Ingrid.\n\nJonas oppgir at forholdet varte omtrent tre måneder. Beskjeden støtter et brudd; den beskriver ikke hva som hendte etter hotellet."),
            E("vehicle-witness", "Kjøretøyet ved butikken", "Supplerende vitnenotat", "Samme vitne som i den første observasjonen", "Rundt kl. 22.16 stanset en mørk stasjonsvogn ved Ingrid. Hun snakket kort med føreren og satte seg deretter inn. Vitnet beskrev ingen synlig tvang.\n\nTidspunktet og biltypen er omtrentlige. Vitnet kunne ikke identifisere føreren eller lese registreringsnummeret. At hun ble med frivillig, kan tyde på at hun kjente vedkommende; det beviser det ikke."),
            E("erik-phone", "Eriks opplysninger kl. 22.24", "Tids- og stedskontroll", "Arkivert vitneopplysning og samtalelogg", "En vitneopplysning knytter Erik til telefonstedet utenfor sentrum rundt kl. 22.24. Samtaleloggen støtter tidspunktet for samtalen.\n\nUndersøk avstanden fra butikken før teorien om bilen vurderes. Opplysningene må vurderes med usikkerheten i begge klokkeslettene."),
            E("vehicle-log", "Kjørebok: bil 14", "Selskapsdokument", "18. desember 1999", "Bil 14\nFører: Lars Viken\nStart: 81 442 km\nSlutt: 81 486 km\n\nKjøreboken angir dagens samlede bruk, ikke en posisjonslogg eller en detaljert rute."),
            E("work-order", "Arbeidsordren", "Selskapsdokument", "Registrert oppdrag 18. desember", "Oppdraget gjelder arbeid ved det registrerte arbeidsstedet. Fra selskapets base og tilbake er den normale ruten omtrent 12 km.\n\nArbeidsordren forklarer ikke alle kilometerne i kjøreboken."),
            E("lars-statement", "Lars' første forklaring", "Forklaring fra 1999", "Saksarkiv · vitneopplysninger", "Lars Viken oppga at han kjente Ingrid fra tidligere, men ikke hadde sett henne på flere dager. Han beskrev bruk av selskapets bil i forbindelse med arbeid. Forklaringen omtaler ingen passasjer."),
            E("card-transaction", "Korttransaksjon kl. 22.52", "Betalingsoversikt", "Selskapets kortopplysninger", "18.12.1999 · kl. 22.52\n146 kr\nTerminal 0184\n\nTransaksjonen er knyttet til selskapets kort og bil 14. Terminalnummeret og varelinjene må kontrolleres før stedet og kjøpet kan tolkes."),
            E("station-receipt", "Varelinjene fra Skardal Nord", "Kontrollert betalingsbilag", "Terminal 0184", "Skardal Nord bensinstasjon\n18.12.1999 · kl. 22.52\nTotalt: 146 kr\n\nRegistrerte varer: drivstoff, spylervæske og tørkepapir.\n\nBilaget dokumenterer et kjøp. Det forteller ikke hva varene senere ble brukt til."),
            E("bumper-report", "Skaden foran til høyre", "Skaderapport", "Bil 14 · 20. desember 1999", "En mindre skade ble registrert på støtfangeren foran til høyre. Lars forklarte at han hadde kommet borti en fast gjenstand under parkering.\n\nRapporten fastslår ikke når eller hvor skaden oppsto, og knytter den ikke alene til Ingrid."),
            E("clean-vehicle", "Den rengjorte bilen", "Arkivert observasjon", "Mandag 20. desember 1999", "En medarbeider beskrev bil 14 som uvanlig grundig rengjort mandag morgen. Det ble ikke sikret et entydig funn som forklarte rengjøringen.\n\nObservasjonen må vurderes sammen med kjøpet, skaden og kjøringen; den er ikke et selvstendig bevis på en forbrytelse."),
            E("emergency-claim", "Påstanden om en hastejobb", "Oppfølgingsnotat", "Ny samtale med Lars", "Lars foreslo en ekstra utrykning som forklaring på kjøringen. Han oppga ikke et kontrollerbart oppdragsnummer eller et bestemt sted. Påstanden kan undersøkes mot vaktloggen og arbeidsordrene."),
            E("no-extra-job", "Ingen registrert ekstra utrykning", "Arkivkontroll", "Vaktlogg og arbeidsordrer", "Det er ikke funnet en registrert ekstra utrykning som forklarer kilometerne. Fravær av en registrering er ikke alene bevis for at ingen tur fant sted. Lars' påstand mangler likevel støtte i de kontrollerte oppdragskildene."),
            E("lars-slip", "Detaljen Lars ikke var spurt om", "Samtalenotat", "Oppfølgingssamtale om bil 14", "Under spørsmål om skaden og rengjøringen sa Lars at Ingrid satte seg inn selv. Den frivillige påstigningen var ikke lagt frem i disse spørsmålene.\n\nUtsagnet må ses mot hans tidligere benektelse av å ha møtt Ingrid. Det identifiserer en konkret motstrid i forklaringen."),
            E("lars-account", "Lars' forklaring om natten", "Oppfølgingsforklaring", "Etter at opplysningene om bilen ble lagt frem", "Lars forklarer at han tok Ingrid med ved butikken, mistet kontrollen på isen ved Gamle Møllevei og traff en betongkulvert. Hun slo hodet og var dårlig. Han ringte ikke etter hjelp.\n\nHan sier at han først kjørte i retning sykehuset, så snudde av frykt for følgene av sin egen kjøring og la Ingrid fra seg ved det gamle serviceområdet. Han sier at han trodde hun var død. Det finnes ikke en medisinsk undersøkelse som bekrefter det nøyaktige dødstidspunktet.\n\nForklaringen må kontrolleres mot hele beviskjeden. Ingen av de enkelte kildene gir alene hele hendelsesforløpet.")
        ];
    }

    public static async Task InitializeAsync(CaseDbContext database)
    {
        if (!await database.People.AnyAsync(x => x.CaseId == "1999-1218" && x.Id == "lars"))
            database.People.Add(new Person { CaseId = "1999-1218", Id = "lars", Name = "Lars Viken", Age = 28,
                Role = "Tekniker i det lokale elselskapet", Introduction = "Lars kjente Ingrid fra tidligere. Hans forklaring og bruk av selskapets bil inngår i materialet som undersøkes." });
        foreach (var record in CreateEvidence())
            if (!await database.Evidence.AnyAsync(x => x.CaseId == record.CaseId && x.Id == record.Id)) database.Evidence.Add(record);
        foreach (var action in CreateActions())
            if (!await database.CaseActions.AnyAsync(x => x.CaseId == action.CaseId && x.Id == action.Id)) database.CaseActions.Add(action);
        var events = new TimelineEvent[]
        {
            new() { Id = "vehicle-pickup", MinuteOfDay = 1336, DisplayOrder = 50, Title = "Påstigning ved butikken", Description = "Vitnet beskriver at Ingrid satte seg inn i en mørk bil uten synlig tvang. Føreren er ikke identifisert i vitneforklaringen.", IsEstimate = true, SourceEvidenceId = "vehicle-witness" },
            new() { Id = "erik-location", MinuteOfDay = 1344, DisplayOrder = 60, Title = "Eriks tidsopplysning", Description = "Vitneopplysning og samtalelogg knytter Erik til telefonstedet utenfor sentrum.", IsEstimate = true, SourceEvidenceId = "erik-phone" },
            new() { Id = "station-payment", MinuteOfDay = 1372, DisplayOrder = 90, Title = "Betaling ved Skardal Nord", Description = "Selskapets kort ble brukt ved bensinstasjonen. Tidspunktet er et kontrollpunkt, ikke en komplett rute.", SourceEvidenceId = "station-receipt" }
        };
        foreach (var item in events)
        {
            item.CaseId = "1999-1218";
            if (!await database.TimelineEvents.AnyAsync(x => x.CaseId == item.CaseId && x.Id == item.Id)) database.TimelineEvents.Add(item);
        }
        // Canonical display ordering is content metadata; player state is not modified.
        var orders = new Dictionary<string, int> { ["shift-start"] = 10, ["phone-call"] = 20,
            ["hotel-departure"] = 30, ["market-sighting"] = 40, ["unexplained-gap"] = 70, ["scheduled-bus"] = 80 };
        foreach (var entry in orders)
        {
            var existing = await database.TimelineEvents.SingleOrDefaultAsync(x => x.CaseId == "1999-1218" && x.Id == entry.Key);
            if (existing is not null) existing.DisplayOrder = entry.Value;
        }
        await database.SaveChangesAsync();
    }
}
