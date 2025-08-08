import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12, fontFamily: 'Helvetica' },
  section: { marginBottom: 12 },
  heading: { fontSize: 16, marginBottom: 6 }
});

const CVDocument = ({ data, labels }) => {
  const { personal, experience, education, skills } = data;
  return (
    <Document>
      <Page style={styles.page}>
        {personal.name && (
          <View style={styles.section}>
            <Text style={styles.heading}>{personal.name}</Text>
            {personal.email && <Text>{personal.email}</Text>}
            {personal.phone && <Text>{personal.phone}</Text>}
            {personal.location && <Text>{personal.location}</Text>}
          </View>
        )}
        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{labels.experience}</Text>
            {experience.map((exp, idx) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <Text>{exp.title}{exp.company ? ` - ${exp.company}` : ''}</Text>
                {exp.date && <Text>{exp.date}</Text>}
                {exp.description && <Text>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{labels.education}</Text>
            {education.map((edu, idx) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <Text>{edu.degree}</Text>
                {edu.institution && <Text>{edu.institution}</Text>}
                {edu.date && <Text>{edu.date}</Text>}
              </View>
            ))}
          </View>
        )}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{labels.skills}</Text>
            {skills.map((skill, idx) => (
              <Text key={idx}>• {skill.name || skill}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default CVDocument;
